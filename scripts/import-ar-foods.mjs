#!/usr/bin/env node
// Carga en la biblioteca de alimentos de FORM los alimentos de uso común en Argentina de
// scripts/ar-foods-data.mjs (tablas ENNyS 2 y Argenfood), con sus valores por 100 g.
//
// Uso:
//   node scripts/import-ar-foods.mjs --dry-run   # solo muestra qué se agregaría
//   node scripts/import-ar-foods.mjs             # carga (con respaldo previo)
//
// - Es idempotente: los alimentos ya cargados (misma tabla de origen y nombre) se omiten.
// - No toca alimentos existentes: si ya hay uno con el mismo nombre, se omite el nuevo.
// - Requiere que la app haya abierto la base con el esquema v6 o posterior.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { AR_FOODS } from "./ar-foods-data.mjs";

const MIN_SCHEMA_VERSION = 6; // necesita foods.reference
const dryRun = process.argv.includes("--dry-run");

const dataDir = process.env.FORM_DATA_DIR ?? path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "form.db");
if (!fs.existsSync(dbPath)) {
  console.error(`No existe ${dbPath}. Abrí la app una vez para que cree la base.`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;");
const { user_version: version } = db.prepare("PRAGMA user_version").get();
if (version < MIN_SCHEMA_VERSION) {
  console.error(`La base está en la versión ${version} del esquema y se necesita la ${MIN_SCHEMA_VERSION} o posterior. Reiniciá la app y abrila una vez para migrarla.`);
  process.exit(1);
}

// validación de los datos antes de escribir
for (const f of AR_FOODS) {
  const ok =
    f.name && f.name.length <= 120 && [f.kcal, f.protein_g, f.carbs_g, f.fat_g].every((n) => Number.isFinite(n) && n >= 0) && f.reference;
  if (!ok) {
    console.error("Dato inválido en ar-foods-data.mjs:", f);
    process.exit(1);
  }
}

const byName = db.prepare("SELECT id, reference FROM foods WHERE name = ? COLLATE NOCASE");
const toAdd = [];
const clashes = [];
let already = 0;
for (const f of AR_FOODS) {
  const rows = byName.all(f.name);
  if (rows.some((r) => r.reference === f.reference)) already++;
  else if (rows.length) clashes.push(f.name);
  else toAdd.push(f);
}

console.log(`Alimentos en el archivo: ${AR_FOODS.length} | ya cargados: ${already} | a agregar: ${toAdd.length} | omitidos por nombre repetido: ${clashes.length}`);
if (clashes.length) console.log("  Omitidos (ya existe un alimento con ese nombre):", clashes.join("; "));
if (dryRun || toAdd.length === 0) {
  console.log(dryRun ? "Simulación: no se escribió nada." : "Nada para agregar.");
  process.exit(0);
}

const backup = path.join(dataDir, `backup-pre-ar-foods-${Date.now()}.db`);
db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
console.log(`Respaldo creado: ${backup}`);

const ins = db.prepare(
  `INSERT INTO foods (name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source, reference)
   VALUES (?, 100, 'g', ?, ?, ?, ?, 'custom', ?)`,
);
db.exec("BEGIN");
try {
  for (const f of toAdd) ins.run(f.name, f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.reference);
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Error durante la carga; no se guardó nada.", err);
  process.exit(1);
}
console.log(`Listo: ${toAdd.length} alimentos agregados a la biblioteca.`);
