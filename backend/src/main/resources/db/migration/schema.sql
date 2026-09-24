PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, client TEXT NOT NULL DEFAULT '', project TEXT NOT NULL DEFAULT '', activity TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '', consultant TEXT NOT NULL DEFAULT '', card_reference TEXT NOT NULL DEFAULT '',
  hourly_rate TEXT, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, task_id TEXT, client TEXT NOT NULL DEFAULT '', project TEXT NOT NULL DEFAULT '',
  activity TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', consultant TEXT NOT NULL DEFAULT '', card_reference TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL, end_at TEXT, planned_seconds INTEGER NOT NULL DEFAULT 0, focus_seconds REAL NOT NULL DEFAULT 0,
  hourly_rate TEXT, status TEXT NOT NULL DEFAULT 'Em andamento', category TEXT NOT NULL DEFAULT 'Normal', imported_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS client_colors (client_key TEXT PRIMARY KEY, client_name TEXT NOT NULL, hex TEXT NOT NULL);
