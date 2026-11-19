// SQLite schema for FORM. Idempotent: safe to run on every start.

const TABLES_WITH_UPDATED_AT = [
  "profile",
  "habits",
  "habit_logs",
  "workout_templates",
  "workout_exercises",
  "workout_sessions",
  "exercise_sets",
  "exercise_catalog",
  "foods",
  "meal_entries",
  "body_measurements",
] as const;

export const SCHEMA_VERSION = 4;

/**
 * Migraciones desde bases existentes. La clave es la versión de origen.
 * Una base nueva se crea directamente con SCHEMA_SQL (ya incluye todos los cambios).
 */
export const MIGRATIONS: Record<number, string> = {
  // v2 -> v3: tipo de serie (calentamiento/fallo/descendente) y duración en segundos
  2: `
    ALTER TABLE exercise_sets ADD COLUMN kind TEXT NOT NULL DEFAULT 'normal'
      CHECK (kind IN ('normal','warmup','failure','drop'));
    ALTER TABLE exercise_sets ADD COLUMN duration_seconds INTEGER CHECK (duration_seconds >= 0);
  `,
  // v3 -> v4: origen USDA de los alimentos (el índice único se crea en SCHEMA_SQL)
  3: `
    ALTER TABLE foods ADD COLUMN fdc_id INTEGER;
  `,
};

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT,
  age_years INTEGER CHECK (age_years BETWEEN 10 AND 120),
  sex TEXT CHECK (sex IN ('male','female','other')),
  height_cm REAL CHECK (height_cm BETWEEN 80 AND 250),
  start_weight_kg REAL CHECK (start_weight_kg BETWEEN 20 AND 400),
  goal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Goals are versioned: the goal for a day is the row with the greatest effective_from <= day.
CREATE TABLE IF NOT EXISTS user_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  effective_from TEXT NOT NULL UNIQUE,
  calories INTEGER NOT NULL CHECK (calories BETWEEN 500 AND 10000),
  protein_g INTEGER NOT NULL CHECK (protein_g BETWEEN 0 AND 600),
  carbs_g INTEGER NOT NULL CHECK (carbs_g BETWEEN 0 AND 1500),
  fat_g INTEGER NOT NULL CHECK (fat_g BETWEEN 0 AND 500),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  category TEXT NOT NULL DEFAULT 'custom'
    CHECK (category IN ('nutrition','activity','recovery','wellbeing','custom')),
  type TEXT NOT NULL DEFAULT 'boolean' CHECK (type IN ('boolean','numeric')),
  target_value REAL CHECK (target_value > 0),
  target_max REAL,
  unit TEXT,
  days_of_week TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7', -- ISO weekdays, 1 = Monday
  system_key TEXT CHECK (system_key IN ('protein_goal','workout_completed','water','steps','sleep')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (type = 'boolean' OR target_value IS NOT NULL),
  CHECK (target_max IS NULL OR target_max >= target_value)
);
CREATE UNIQUE INDEX IF NOT EXISTS habits_system_key_uniq ON habits(system_key) WHERE system_key IS NOT NULL;

-- One row per habit per day. Target is snapshotted so history survives habit edits.
CREATE TABLE IF NOT EXISTS habit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE RESTRICT,
  log_date TEXT NOT NULL,
  value REAL CHECK (value >= 0),
  target_snapshot REAL,
  target_max_snapshot REAL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS habit_logs_date_idx ON habit_logs(log_date);

CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Catálogo de ejercicios con sus músculos (principales y accesorios) para medir progreso por músculo.
CREATE TABLE IF NOT EXISTS muscles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(name) BETWEEN 1 AND 80),
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('seed','custom')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercise_muscles (
  exercise_id INTEGER NOT NULL REFERENCES exercise_catalog(id) ON DELETE CASCADE,
  muscle_id INTEGER NOT NULL REFERENCES muscles(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('primary','secondary')),
  PRIMARY KEY (exercise_id, muscle_id)
);
CREATE INDEX IF NOT EXISTS exercise_muscles_muscle_idx ON exercise_muscles(muscle_id, role);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  catalog_id INTEGER REFERENCES exercise_catalog(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  target_sets INTEGER NOT NULL CHECK (target_sets BETWEEN 1 AND 20),
  rep_min INTEGER NOT NULL CHECK (rep_min >= 1),
  rep_max INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (rep_max >= rep_min)
);
CREATE INDEX IF NOT EXISTS workout_exercises_tpl_idx ON workout_exercises(template_id, position);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  session_date TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS workout_sessions_date_idx ON workout_sessions(session_date DESC);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE SET NULL,
  catalog_id INTEGER REFERENCES exercise_catalog(id) ON DELETE SET NULL, -- enlaza la serie con sus músculos
  exercise_name TEXT NOT NULL,
  exercise_position INTEGER NOT NULL DEFAULT 0,
  set_number INTEGER NOT NULL CHECK (set_number >= 1),
  weight_kg REAL NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  reps INTEGER NOT NULL CHECK (reps BETWEEN 0 AND 200),
  kind TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal','warmup','failure','drop')),
  duration_seconds INTEGER CHECK (duration_seconds >= 0), -- ejercicios isométricos/cardio medidos en tiempo
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, exercise_position, set_number)
);
CREATE INDEX IF NOT EXISTS exercise_sets_name_idx ON exercise_sets(exercise_name, created_at DESC);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  serving_size REAL NOT NULL DEFAULT 100 CHECK (serving_size > 0),
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories REAL NOT NULL CHECK (calories >= 0),
  protein_g REAL NOT NULL CHECK (protein_g >= 0),
  carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
  fat_g REAL NOT NULL CHECK (fat_g >= 0),
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('seed_approx','custom')),
  fdc_id INTEGER, -- id en USDA FoodData Central si el alimento se importó de allí
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS foods_fdc_idx ON foods(fdc_id) WHERE fdc_id IS NOT NULL;

-- Macros are stored as the totals eaten at log time: editing a food never rewrites past days.
CREATE TABLE IF NOT EXISTS meal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','snack','dinner')),
  food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories REAL NOT NULL CHECK (calories >= 0),
  protein_g REAL NOT NULL CHECK (protein_g >= 0),
  carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
  fat_g REAL NOT NULL CHECK (fat_g >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS meal_entries_date_idx ON meal_entries(entry_date DESC);

CREATE TABLE IF NOT EXISTS body_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  measured_on TEXT NOT NULL UNIQUE,
  weight_kg REAL CHECK (weight_kg BETWEEN 20 AND 400),
  waist_cm REAL CHECK (waist_cm BETWEEN 20 AND 300),
  chest_cm REAL CHECK (chest_cm BETWEEN 20 AND 300),
  arm_cm REAL CHECK (arm_cm BETWEEN 5 AND 100),
  hip_cm REAL CHECK (hip_cm BETWEEN 20 AND 300),
  thigh_cm REAL CHECK (thigh_cm BETWEEN 10 AND 150),
  body_fat_pct REAL CHECK (body_fat_pct BETWEEN 2 AND 70), -- manual entry only, never estimated
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (weight_kg IS NOT NULL OR waist_cm IS NOT NULL OR chest_cm IS NOT NULL OR arm_cm IS NOT NULL
         OR hip_cm IS NOT NULL OR thigh_cm IS NOT NULL OR body_fat_pct IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taken_on TEXT NOT NULL,
  pose TEXT NOT NULL DEFAULT 'front' CHECK (pose IN ('front','side','back','other')),
  file_name TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

${TABLES_WITH_UPDATED_AT.map(
  (t) => `CREATE TRIGGER IF NOT EXISTS ${t}_touch AFTER UPDATE ON ${t}
  FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
  BEGIN UPDATE ${t} SET updated_at = datetime('now') WHERE rowid = NEW.rowid; END;`,
).join("\n")}
`;
