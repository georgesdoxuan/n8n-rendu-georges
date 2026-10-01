const message_re_u = trigger({
  type: 'n8n-nodes-base.telegramTrigger',
  version: 1.1,
  config: { name: 'Message reçu', parameters: { updates: ['message'] }, credentials: { telegramApi: newCredential('Telegram account', '7EfU45rwhfRJycb0') }, webhookId: '47b78df7-d0a4-4cc0-9cf5-c7f87767d94d' }
});

const qui_crit = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Qui écrit ?', parameters: { mode: 'runOnceForAllItems', jsCode: 'const m = $json.message || {}; const c = m.chat || {}; return [{ json: { chat_id: c.id, type: c.type, prenom: (m.from || {}).first_name || \'\', nom: (m.from || {}).last_name || \'\', texte: m.text || \'(pas de texte)\' } }];' }, position: [224, 0] }
});

const wf = workflow('p1y8DqXAAMddcGwh', 'CAPTURE chat_id ami (temporaire, à supprimer)', { executionOrder: 'v1', availableInMCP: true });

export default wf
  .add(message_re_u)
  .to(qui_crit)