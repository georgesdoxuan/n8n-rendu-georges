const upload_Document = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: { name: 'Upload Document', parameters: { formTitle: 'RAG E-Com Upload', formDescription: 'Add a PDF to the knowledge base, remove one, or replace everything. Multiple documents can coexist.', formFields: { values: [{ fieldLabel: 'Mode', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Add document' }, { option: 'Remove document' }, { option: 'Replace all documents' }] }, requiredField: true, defaultValue: 'Add document' }, { fieldLabel: 'Document', fieldType: 'file', multipleFiles: false, acceptFileTypes: '.pdf' }, { fieldLabel: 'Document Name', fieldType: 'text', placeholder: 'for removal: exact source name, e.g. cdc_25517_DS1.pdf' }] }, options: { buttonLabel: 'Apply', respondWithOptions: { values: { formSubmittedText: 'Request received. Processing is running.' } } } }, position: [-320, 80], webhookId: '74436a0d-b7b7-4622-85d2-486bd90a8073', notes: 'Formulaire web public : ajouter un PDF (fichier ou URL), en supprimer un par nom, ou tout remplacer.', notesInFlow: true }
});


const route_Mode = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Route Mode', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2.2 }, conditions: [{ id: 'mode-remove', leftValue: expr("={{ $json['Mode'] || $json.mode || $json.body?.mode || 'Add document' }}"), rightValue: 'Remove document', operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' } }], combinator: 'and' }, options: {} }, position: [-700, 300], notes: 'Carrefour 1 : mode Remove document vers la branche de suppression, tout le reste vers l’ingestion.', notesInFlow: true }
});

const check_Replace_All = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Check Replace All', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2.2 }, conditions: [{ id: 'mode-replace', leftValue: expr("={{ $json['Mode'] || $json.mode || $json.body?.mode || 'Add document' }}"), rightValue: 'Replace all documents', operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' } }], combinator: 'and' }, options: {} }, position: [-460, 420], notes: 'Carrefour 2 : si mode Replace All, la table documents est vidée avant d’ingérer le nouveau document.', notesInFlow: true }
});

const delete_Document = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Delete Document', parameters: { resource: 'database', operation: 'executeQuery', query: 'delete from documents where source = $1::text;', options: { queryReplacement: expr("={{ [$json['Document Name'] || $json.name || $json.body?.name] }}") } }, credentials: { postgres: newCredential('Postgres account', '53nEuQ2JNY7Fm05r') }, position: [-480, 80], notes: 'Supprime tous les chunks dont la colonne source correspond au nom du document demandé.', notesInFlow: true }
});

const clear_Documents = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Clear Documents', parameters: { resource: 'database', operation: 'executeQuery', query: 'delete from documents;', options: {} }, credentials: { postgres: newCredential('Postgres account', '53nEuQ2JNY7Fm05r') }, position: [-240, 480], notes: 'Vide toute la table documents (mode Replace All). Son résultat est ignoré par le merge After Clear : le fichier uploadé n’est pas perdu.', alwaysOutputData: true, notesInFlow: true }
});

const keep_Trigger_Input = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: { name: 'Keep Trigger Input', parameters: {}, position: [-240, 640], notes: 'Fait passer le fichier original en parallèle pendant que la branche Clear Documents s’exécute.', notesInFlow: true }
});

const after_Clear = merge({
  version: 3.2,
  config: { name: 'After Clear', parameters: { mode: 'chooseBranch', chooseBranchMode: 'waitForAll', output: 'specifiedInput', useDataOfInput: '1' }, position: [-20, 480], notes: 'Attend que la table soit vidée, puis reprend le fichier uploadé pour démarrer l’ingestion propre.', notesInFlow: true }
});



const prepare_Source = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Prepare Source', parameters: { mode: 'runOnceForAllItems', jsCode: '// Captures the source document name from the uploaded binary filename (for\n// metadata tagging and targeted removal). Keeps all original fields (including\n// the mode) so downstream routing keeps working.\nconst binKey = Object.keys($binary || {})[0];\nconst source = binKey && $binary[binKey] && $binary[binKey].fileName\n  ? $binary[binKey].fileName\n  : \'document.pdf\';\nreturn $input.all().map((item) => ({\n  json: { ...item.json, source },\n  binary: item.binary,\n}));' }, position: [0, 180], notes: 'Capture le nom du document source (fichier uploadé ou URL) et laisse passer le binaire vers l’extraction.', notesInFlow: true }
});

const extract_PDF_Text = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.1,
  config: { name: 'Extract PDF Text', parameters: { operation: 'pdf', binaryPropertyName: expr('{{ Object.keys($binary)[0] }}'), options: {} }, position: [220, 300], notes: 'Extrait le texte brut du PDF, page par page. Attention : ce node jette les autres champs json, le mode est ré-injecté par Chunk Document.', notesInFlow: true }
});

const chunk_Document = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Chunk Document', parameters: { mode: 'runOnceForAllItems', jsCode: '// Splits the extracted PDF pages into overlapping chunks and tags each chunk\n// with its source document, page number, and routing mode (re-injected here\n// because Extract PDF Text drops the original json fields).\nconst source = $(\'Prepare Source\').first().json.source || \'document.pdf\';\nlet mode = \'Add document\';\ntry {\n  const form = $(\'Upload Document\').first().json;\n  if (form[\'Mode\']) mode = form[\'Mode\'];\n} catch (e) {}\nconst items = $input.all();\nconst pages = [];\nfor (const item of items) {\n  const j = item.json;\n  if (typeof j === \'string\') { pages.push({ text: j }); continue; }\n  if (Array.isArray(j?.pages)) { pages.push(...j.pages); continue; }\n  if (typeof j?.text === \'string\') { pages.push(j); continue; }\n  if (typeof j?.data === \'string\') { pages.push({ text: j.data }); continue; }\n  if (j?.data && typeof j.data === \'object\') {\n    if (Array.isArray(j.data.pages)) pages.push(...j.data.pages);\n    else pages.push(j.data);\n    continue;\n  }\n  pages.push(j);\n}\n\nconst CHUNK_SIZE = 1500;\nconst OVERLAP = 200;\nconst chunks = [];\nfor (const [pageIndex, page] of pages.entries()) {\n  const text = String(page?.text ?? page?.content ?? page ?? \'\')\n    .replace(/\\s+/g, \' \')\n    .trim();\n  if (!text) continue;\n  const pageNumber = Number(page?.page ?? page?.pageNumber ?? pageIndex + 1) || pageIndex + 1;\n  for (let start = 0; start < text.length; start += CHUNK_SIZE - OVERLAP) {\n    chunks.push({\n      content: text.slice(start, start + CHUNK_SIZE).trim(),\n      source,\n      page: pageNumber,\n      mode,\n    });\n    if (start + CHUNK_SIZE >= text.length) break;\n  }\n}\nreturn chunks;' }, position: [440, 300], notes: 'Découpe le texte en morceaux de 1500 caractères (chevauchement 200) et tague chaque morceau avec sa source, son numéro de page et le mode.', notesInFlow: true }
});

const skip_Already_Ingested = node({
  type: 'n8n-nodes-base.removeDuplicates',
  version: 2,
  config: { name: 'Skip Already Ingested', parameters: { operation: 'removeItemsSeenInPreviousExecutions', scope: 'node', historySize: 10000, dedupeValue: expr("={{ ($json.mode === 'Replace all documents' ? 'run-' + Date.now() : $json.source + '::' + $json.page + '::' + $json.content.slice(0, 60)) }}") , historySize: 1000 }, position: [660, 300], notes: 'Anti-doublon : saute les chunks déjà ingérés pour la même source. Le mode Replace All utilise une valeur propre à chaque exécution pour toujours ré-insérer après le vidage.', notesInFlow: true }
});

const embed_Chunks = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Embed Chunks', parameters: { method: 'POST', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: expr('{\n  "content": {\n    "parts": [\n      {\n        "text": {{ $json.content.trim() ? $json.content.trim().toJsonString() : \'"empty"\' }}\n      }\n    ]\n  },\n  "output_dimensionality": 512,\n  "taskType": "RETRIEVAL_DOCUMENT"\n}'), options: {} }, credentials: { httpHeaderAuth: newCredential('Gemini API', '1G2cMNKBw5LxbWTO') }, position: [880, 300], notes: 'Calcule un embedding (vecteur 512 dimensions) pour chaque chunk via l’API Gemini (mode retrieval-document). Sa réponse ne contient que le résultat : Prepare Row re-récupère les champs du chunk.', retryOnFail: true, maxTries: 5, waitBetweenTries: 3000, notesInFlow: true }
});

const prepare_Row = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Prepare Row', parameters: { assignments: { assignments: [{ id: 'row-content', name: 'content', value: expr("={{ $('Skip Already Ingested').item.json.content }}"), type: 'string' }, { id: 'row-meta', name: 'metadata', value: '{}', type: 'string' }, { id: 'row-source', name: 'source', value: expr("={{ $('Skip Already Ingested').item.json.source }}"), type: 'string' }, { id: 'row-page', name: 'page', value: expr("={{ $('Skip Already Ingested').item.json.page }}"), type: 'number' }, { id: 'row-emb', name: 'embedding', value: expr('={{ JSON.stringify($json.embedding.values) }}'), type: 'string' }] }, options: {} }, position: [1100, 300], notes: 'Reconstruit les champs perdus pendant l’appel embedding et aplatit l’embedding en chaîne JSON de nombres.', notesInFlow: true }
});

const store_Chunks = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Store Chunks', parameters: { resource: 'database', operation: 'executeQuery', query: 'insert into documents (content, metadata, embedding, source, page) values ($1::text, $2::jsonb, $3::vector, $4::text, $5::int);', options: { queryReplacement: expr("={{ [$json.content, '{}', $json.embedding, $json.source, $json.page] }}") } }, credentials: { postgres: newCredential('Postgres account', '53nEuQ2JNY7Fm05r') }, position: [1320, 300], notes: 'Insère chaque chunk (contenu, métadonnées, source, page, embedding) dans la table documents de Supabase.', notesInFlow: true }
});

const wf = workflow('zdxG1DepWxrK8a8V', 'RAG E-Com Ingestion', { binaryMode: 'separate', description: 'RAG ingestion pipeline: form or webhook upload of a PDF (file or URL), mode-based routing (add, remove one document, replace all), chunking with source metadata, Gemini embeddings, Supabase pgvector storage.', availableInMCP: true, executionOrder: 'v1' });

export default wf
  .add(upload_Document)
  .to(route_Mode)
  .add(route_Mode.onTrue(delete_Document))
  .add(route_Mode.onFalse(check_Replace_All))
  .add(check_Replace_All.onTrue(keep_Trigger_Input.to(after_Clear.input(0))))
  .add(check_Replace_All.onTrue(clear_Documents.to(after_Clear.input(1))))
  .add(after_Clear)
  .to(prepare_Source)
  .add(check_Replace_All.onFalse(prepare_Source))
  .add(prepare_Source)
  .to(extract_PDF_Text)
  .to(chunk_Document)
  .to(skip_Already_Ingested)
  .to(embed_Chunks)
  .to(prepare_Row)
  .to(store_Chunks);
