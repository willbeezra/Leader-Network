-- Migration 0048 : Table de logs pour l'Agent IA Admin (Copilote)
-- Trace toutes les interactions : questions, SQL généré, exécutions validées

CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  admin_id     TEXT NOT NULL REFERENCES admin_users(id),
  session_id   TEXT NOT NULL,                        -- regroupe les échanges d'une même conversation
  role         TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content      TEXT NOT NULL,                        -- message brut (question ou réponse IA)
  sql_plan     TEXT,                                 -- JSON : liste des requêtes SQL proposées
  sql_executed INTEGER NOT NULL DEFAULT 0,           -- 1 = l'admin a cliqué Appliquer
  sql_result   TEXT,                                 -- résultat JSON après exécution
  tokens_used  INTEGER,                              -- usage OpenAI (prompt + completion)
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_admin   ON ai_agent_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_session ON ai_agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created ON ai_agent_logs(created_at DESC);
