-- Strategy is a source of context for existing tareas/publicaciones, never a
-- parallel task tracker. All new data is private; authorized server APIs mediate it.
BEGIN;
CREATE TABLE IF NOT EXISTS strategy_records (
 id uuid PRIMARY KEY, marca_id uuid NOT NULL REFERENCES marcas(id),
 kind text NOT NULL CHECK(kind IN ('sheet','campaign','opportunity','settings','approval')),
 title text NOT NULL, data jsonb NOT NULL DEFAULT '{}', revision integer NOT NULL DEFAULT 1,
 archived boolean NOT NULL DEFAULT false, created_by uuid NOT NULL REFERENCES team_members(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strategy_brand ON strategy_records(marca_id,kind,updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS strategy_settings_brand ON strategy_records(marca_id) WHERE kind='settings';
CREATE TABLE IF NOT EXISTS strategy_scenes (
 sheet_id uuid PRIMARY KEY REFERENCES strategy_records(id) ON DELETE CASCADE,
 elements jsonb NOT NULL DEFAULT '[]', files jsonb NOT NULL DEFAULT '{}', revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS strategy_history (
 id bigserial PRIMARY KEY, record_id uuid NOT NULL REFERENCES strategy_records(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL, label text NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strategy_history_record ON strategy_history(record_id,created_at DESC);
CREATE TABLE IF NOT EXISTS strategy_sessions (
 id uuid PRIMARY KEY, sheet_id uuid NOT NULL REFERENCES strategy_records(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL, state text NOT NULL DEFAULT 'manual', data jsonb NOT NULL DEFAULT '{}',
 started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);
CREATE TABLE IF NOT EXISTS strategy_segments (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES strategy_sessions(id) ON DELETE CASCADE,
 start_seconds integer NOT NULL DEFAULT 0, duration integer NOT NULL DEFAULT 0,
 media_path text NOT NULL, mime text NOT NULL, transcript text NOT NULL DEFAULT '', state text NOT NULL DEFAULT 'saved',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS strategy_actions (
 id uuid PRIMARY KEY, sheet_id uuid NOT NULL REFERENCES strategy_records(id) ON DELETE CASCADE,
 session_id uuid REFERENCES strategy_sessions(id), fingerprint text NOT NULL, data jsonb NOT NULL,
 task_id uuid REFERENCES tareas(id) ON DELETE SET NULL, sent_at timestamptz, original_task_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(sheet_id,fingerprint)
);
CREATE TABLE IF NOT EXISTS strategy_links (
 id uuid PRIMARY KEY, marca_id uuid NOT NULL REFERENCES marcas(id), campaign_id uuid REFERENCES strategy_records(id),
 sheet_id uuid REFERENCES strategy_records(id), target_type text NOT NULL, target_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,target_type,target_id), UNIQUE(sheet_id,target_type,target_id)
);
CREATE TABLE IF NOT EXISTS strategy_comments (
 id uuid PRIMARY KEY, sheet_id uuid NOT NULL REFERENCES strategy_records(id) ON DELETE CASCADE,
 author_id uuid NOT NULL, author_name text NOT NULL, text text NOT NULL, element_id text,
 resolved boolean NOT NULL DEFAULT false, shared boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS strategy_presence (
 sheet_id uuid NOT NULL REFERENCES strategy_records(id) ON DELETE CASCADE, client_id uuid NOT NULL,
 user_id uuid NOT NULL, name text NOT NULL, data jsonb NOT NULL DEFAULT '{}', seen_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(sheet_id,client_id)
);
CREATE TABLE IF NOT EXISTS strategy_notifications (
 action_id uuid PRIMARY KEY REFERENCES strategy_actions(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES team_members(id), title text NOT NULL, href text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['strategy_records','strategy_scenes','strategy_history','strategy_sessions','strategy_segments','strategy_actions','strategy_links','strategy_comments','strategy_presence','strategy_notifications'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated',t);
 END LOOP;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('strategy-recordings','strategy-recordings',false,26214400,ARRAY['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav'])
 ON CONFLICT(id) DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
