-- Setup Supabase pour le chatbot RAG E-Com (a executer une fois dans le SQL Editor)

-- 1. Extension pgvector
create extension if not exists vector;

-- 2. Table des chunks de documents
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(512),
  source text,
  page integer
);

-- 3. Recherche vectorielle (utilisee par le nœud PGVector)
create or replace function match_documents (
  query_embedding vector(512),
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  select id, content, metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where filter = '{}'::jsonb or metadata is null or metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 4. Recherche plein texte (Keyword Search)
alter table documents add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(content, ''))) stored;
create index if not exists documents_fts_idx on documents using gin(fts);

-- 5. Metadata jsonb auto-remplie a chaque insert (source + page)
create or replace function documents_fill_meta() returns trigger as $$
begin
  new.metadata := jsonb_build_object('source', new.source, 'page', new.page);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_meta on documents;
create trigger trg_documents_meta before insert on documents
  for each row execute function documents_fill_meta();

-- 6. Backfill des lignes deja presentes
update documents set metadata = jsonb_build_object('source', source, 'page', page)
where source is not null;

-- 7. Securite : RLS (le service_role passe quand meme, anon/authentifie bloques)
alter table documents enable row level security;

-- Note : la table n8n_chat_histories (memoire persistante) est creee
-- automatiquement par le nœud Postgres Chat Memory au premier usage.
