#!/usr/bin/env node
// Importa el historial de una exportación CSV de la app Strong a la base de FORM.
//
// Uso:
//   node scripts/import-strong.mjs "C:\ruta\strong_workouts.csv"            # importa
//   node scripts/import-strong.mjs "C:\ruta\strong_workouts.csv" --dry-run  # solo valida y resume
//
// - Antes de escribir crea una copia consistente de la base (data/backup-pre-strong-*.db).
// - Es idempotente: los entrenamientos ya importados (misma fecha/hora y nombre) se omiten.
// - Los ejercicios se traducen/mapean al catálogo (scripts/strong-exercises.mjs); los nuevos
//   se crean con sus músculos principales y accesorios.
// - Tipos de serie de Strong: P = calentamiento, F = al fallo, S = descendente, número = normal.
// - Se asume que los pesos están en kg. El RPE no se importa (FORM no lo registra).
// Requiere Node 22.13+ y que la app haya abierto la base al menos una vez con el esquema v3.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { STRONG_EXERCISES } from "./strong-exercises.mjs";

const SCHEMA_VERSION = 3;
const MARKER = "Importado de Strong";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error('Falta la ruta del CSV. Ejemplo: node scripts/import-strong.mjs "D:\\DESCARGAS\\strong_workouts.csv"');
  process.exit(1);
}

/* ------------------------------ CSV ------------------------------ */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0]?.trim());
}

const COLUMNS = {
  date: ["Fecha", "Date"],
  workout: ["Nombre de entrenamiento", "Workout Name"],
  duration: ["Duración", "Duration"],
  exercise: ["Nombre del ejercicio", "Exercise Name"],
  setOrder: ["Orden de la serie", "Set Order"],
  weight: ["Peso", "Weight"],
  reps: ["Rep.", "Reps"],
  seconds: ["Segundos", "Seconds"],
};

const [header, ...body] = parseCsv(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const col = {};
for (const [key, names] of Object.entries(COLUMNS)) {
  const i = header.findIndex((h) => names.includes(h.trim()));
  if (i < 0) {
    console.error(`No encuentro la columna "${names[0]}" en el CSV. Columnas: ${header.join(", ")}`);
    process.exit(1);
  }
  col[key] = i;
}

/* ------------------------------ conversiones ------------------------------ */

const KIND = { P: "warmup", W: "warmup", F: "failure", S: "drop", D: "drop" };

function parseKind(order) {
  const o = order.trim();
  if (/^\d+$/.test(o)) return "normal";
  const k = KIND[o.toUpperCase()];
  if (!k) throw new Error(`Tipo de serie desconocido: "${order}"`);
  return k;
}

function parseDurationMinutes(text) {
  const h = /(\d+)\s*h/.exec(text)?.[1];
  const m = /(\d+)\s*min/.exec(text)?.[1];
  return (h ? Number(h) * 60 : 0) + (m ? Number(m) : 0);
}

const p2 = (n) => String(n).padStart(2, "0");
const utcString = (d) =>
  `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;

/** "2022-01-25 15:33:08" (hora local) -> { localDate, startUtc, date } */
function parseStart(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text.trim());
  if (!m) throw new Error(`Fecha inválida: "${text}"`);
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  return { localDate: `${m[1]}-${m[2]}-${m[3]}`, date: new Date(y, mo - 1, d, h, mi, s) };
}

/* ------------------------------ agrupar en entrenamientos ------------------------------ */

const byName = new Map(STRONG_EXERCISES.map((x) => [x.strong.trim(), x]));
const unmapped = new Set();
const sessions = new Map();

for (const r of body) {
  const startText = r[col.date];
  const workout = r[col.workout].trim();
  const exName = r[col.exercise].trim();
  const map = byName.get(exName);
  if (!map) {
    unmapped.add(exName);
    continue;
  }
  const key = `${startText}|${workout}`;
  let s = sessions.get(key);
  if (!s) {
    const { localDate, date } = parseStart(startText);
    const end = new Date(date.getTime() + parseDurationMinutes(r[col.duration]) * 60_000);
    s = { name: workout || "Entrenamiento", localDate, startedAt: utcString(date), endedAt: utcString(end), exercises: new Map(), sets: [] };
    sessions.set(key, s);
  }
  if (!s.exercises.has(exName)) s.exercises.set(exName, s.exercises.size + 1);
  const seconds = Math.round(Number(r[col.seconds]) || 0);
  s.sets.push({
    exName,
    position: s.exercises.get(exName),
    kind: parseKind(r[col.setOrder]),
    weight: Number(r[col.weight]) || 0,
    reps: Math.round(Number(r[col.reps]) || 0),
    seconds: seconds > 0 ? seconds : null,
  });
}

if (unmapped.size) {
  console.error("Ejercicios sin mapear en scripts/strong-exercises.mjs:\n  - " + [...unmapped].join("\n  - "));
  process.exit(1);
}

const totalSets = [...sessions.values()].reduce((n, s) => n + s.sets.length, 0);
const kinds = {};
for (const s of sessions.values()) for (const x of s.sets) kinds[x.kind] = (kinds[x.kind] ?? 0) + 1;
const dates = [...sessions.values()].map((s) => s.localDate).sort();
console.log(`CSV: ${body.length} filas -> ${sessions.size} entrenamientos, ${totalSets} series, ${new Set(body.map((r) => r[col.exercise].trim())).size} ejercicios`);
console.log(`Rango: ${dates[0]} a ${dates.at(-1)} | series por tipo: ${JSON.stringify(kinds)}`);

/* ------------------------------ base de datos ------------------------------ */

const dataDir = process.env.FORM_DATA_DIR ?? path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "form.db");
if (!fs.existsSync(dbPath)) {
  console.error(`No existe ${dbPath}. Abrí la app una vez para que cree la base.`);
  process.exit(1);
}
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;");
const { user_version: version } = db.prepare("PRAGMA user_version").get();
if (version !== SCHEMA_VERSION) {
  console.error(`La base está en la versión ${version} del esquema y se necesita la ${SCHEMA_VERSION}. Reiniciá la app y abrila una vez para migrarla.`);
  process.exit(1);
}

const muscleId = new Map(db.prepare("SELECT id, key FROM muscles").all().map((m) => [m.key, m.id]));
const findCatalog = db.prepare("SELECT id FROM exercise_catalog WHERE name = ? COLLATE NOCASE");
const insCatalog = db.prepare("INSERT INTO exercise_catalog (name, source) VALUES (?, 'custom')");
const insLink = db.prepare("INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES (?, ?, ?)");

// Verificación previa: nada de lo que falte en el catálogo puede quedar sin músculos
const missing = [];
for (const x of STRONG_EXERCISES) {
  if (!findCatalog.get(x.es) && !x.muscles) missing.push(x.es);
  for (const k of [...(x.muscles?.primary ?? []), ...(x.muscles?.secondary ?? [])]) {
    if (!muscleId.has(k)) missing.push(`${x.es}: músculo desconocido "${k}"`);
  }
}
if (missing.length) {
  console.error("Problemas en el mapa de ejercicios:\n  - " + missing.join("\n  - "));
  process.exit(1);
}

if (dryRun) {
  const toCreate = STRONG_EXERCISES.filter((x) => !findCatalog.get(x.es) && sessions.size).length;
  const dup = db.prepare("SELECT COUNT(*) AS n FROM workout_sessions WHERE notes = ?").get(MARKER).n;
  console.log(`Simulación: se crearían ${toCreate} ejercicios nuevos en el catálogo; ya hay ${dup} entrenamientos importados antes. No se escribió nada.`);
  process.exit(0);
}

const existing = db.prepare("SELECT 1 AS x FROM workout_sessions WHERE notes = ? AND started_at = ? AND name = ?");
const pending = [...sessions.values()].filter((s) => !existing.get(MARKER, s.startedAt, s.name)).length;
if (pending === 0) {
  console.log(`Nada para importar: los ${sessions.size} entrenamientos ya estaban en la base.`);
  process.exit(0);
}

const backup = path.join(dataDir, `backup-pre-strong-${Date.now()}.db`);
db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
console.log(`Respaldo creado: ${backup}`);

const insSession = db.prepare("INSERT INTO workout_sessions (template_id, name, session_date, started_at, ended_at, notes) VALUES (NULL, ?, ?, ?, ?, ?)");
const insSet = db.prepare(
  `INSERT INTO exercise_sets (session_id, catalog_id, exercise_name, exercise_position, set_number, weight_kg, reps, kind, duration_seconds)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

let createdExercises = 0;
let importedSessions = 0;
let skippedSessions = 0;
let importedSets = 0;

db.exec("BEGIN");
try {
  const catalogId = new Map();
  for (const x of STRONG_EXERCISES) {
    let row = findCatalog.get(x.es);
    if (!row) {
      const id = Number(insCatalog.run(x.es).lastInsertRowid);
      x.muscles.primary.forEach((k) => insLink.run(id, muscleId.get(k), "primary"));
      x.muscles.secondary.filter((k) => !x.muscles.primary.includes(k)).forEach((k) => insLink.run(id, muscleId.get(k), "secondary"));
      row = { id };
      createdExercises++;
    }
    catalogId.set(x.strong.trim(), { id: row.id, name: x.es });
  }

  for (const s of [...sessions.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    if (existing.get(MARKER, s.startedAt, s.name)) {
      skippedSessions++;
      continue;
    }
    const sid = Number(insSession.run(s.name, s.localDate, s.startedAt, s.endedAt, MARKER).lastInsertRowid);
    const counters = new Map();
    for (const x of s.sets) {
      const n = (counters.get(x.position) ?? 0) + 1;
      counters.set(x.position, n);
      const cat = catalogId.get(x.exName);
      insSet.run(sid, cat.id, cat.name, x.position, n, x.weight, x.reps, x.kind, x.seconds);
      importedSets++;
    }
    importedSessions++;
  }
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Error durante la importación; no se guardó nada.", err);
  process.exit(1);
}

console.log(`Listo: ${importedSessions} entrenamientos y ${importedSets} series importados, ${skippedSessions} omitidos (ya existían), ${createdExercises} ejercicios nuevos en el catálogo.`);
