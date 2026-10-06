PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, client TEXT NOT NULL DEFAULT '', project TEXT NOT NULL DEFAULT '', activity TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '', consultant TEXT NOT NULL DEFAULT '', card_reference TEXT NOT NULL DEFAULT '',
  hourly_rate TEXT, completed INTEGER NOT NULL DEFAULT 0, state TEXT, due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, task_id TEXT, client TEXT NOT NULL DEFAULT '', project TEXT NOT NULL DEFAULT '',
  activity TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', consultant TEXT NOT NULL DEFAULT '', card_reference TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL, end_at TEXT, rounded_end_at TEXT, planned_seconds INTEGER NOT NULL DEFAULT 0, focus_seconds REAL NOT NULL DEFAULT 0,
  hourly_rate TEXT, status TEXT NOT NULL DEFAULT 'Em andamento', category TEXT NOT NULL DEFAULT 'Normal', imported_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS client_colors (client_key TEXT PRIMARY KEY, client_name TEXT NOT NULL, hex TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalog_clients (name_key TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalog_projects (name_key TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalog_activities (name_key TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS change_history (
  id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  changed_at TEXT NOT NULL, old_value TEXT, new_value TEXT
);
CREATE INDEX IF NOT EXISTS idx_change_history_entity ON change_history(entity_type,entity_id,changed_at DESC);
CREATE TABLE IF NOT EXISTS task_plans (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  planned_date TEXT, priority INTEGER NOT NULL DEFAULT 0, next_action TEXT NOT NULL DEFAULT '',
  waiting_for TEXT NOT NULL DEFAULT '', review_date TEXT
);
CREATE TABLE IF NOT EXISTS task_inbox (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL, recurrence TEXT NOT NULL DEFAULT 'none', next_date TEXT
);
CREATE TABLE IF NOT EXISTS daily_reviews (
  day TEXT PRIMARY KEY, notes TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_estimates (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 100000)
);
CREATE TABLE IF NOT EXISTS task_archive (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE, archived_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_archive (
  name_key TEXT PRIMARY KEY REFERENCES catalog_projects(name_key) ON UPDATE CASCADE ON DELETE CASCADE,
  archived_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_checklist (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checklist_task ON task_checklist(task_id,position);
CREATE TABLE IF NOT EXISTS template_options (
  template_id TEXT PRIMARY KEY REFERENCES task_templates(id) ON DELETE CASCADE,
  paused INTEGER NOT NULL DEFAULT 0, weekdays TEXT NOT NULL DEFAULT '', month_day INTEGER
);
