import "server-only";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS, SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedIfEmpty } from "./seed";

export const DATA_DIR = process.env.FORM_DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const PHOTOS_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "photos");

const globalForDb = globalThis as unknown as { __formDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(/*turbopackIgnore: true*/ DATA_DIR, "form.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  let { user_version: version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  const hasProfile = db.prepare("SELECT 1 AS x FROM sqlite_master WHERE name = 'profile'").get();
  if (hasProfile) {
    if (version < 2) {
      throw new Error(
        `La base de datos (versión ${version}) es demasiado antigua para migrarse. Mové data/form.db a otra carpeta para empezar de cero.`,
      );
    }
    if (version > SCHEMA_VERSION) {
      // Nunca se baja el número de versión: una app más vieja corrompería el control de migraciones.
      throw new Error(
        `La base de datos es de una versión más nueva (${version}) que esta app (${SCHEMA_VERSION}). Actualizá el código antes de abrirla.`,
      );
    }
    // Migraciones encadenadas, cada una atómica. Se respalda antes de tocar nada.
    if (version < SCHEMA_VERSION) {
      // copia consistente de la base (aunque esté en modo WAL) antes de migrar
      const backup = path.join(/*turbopackIgnore: true*/ DATA_DIR, `backup-v${version}-${Date.now()}.db`);
      db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    }
    while (version < SCHEMA_VERSION) {
      const sql = MIGRATIONS[version];
      if (!sql) throw new Error(`No hay migración desde la versión ${version} del esquema.`);
      db.exec("BEGIN");
      try {
        // Cada sentencia por separado: si una columna ya existe (migración aplicada a medias), se sigue.
        for (const stmt of sql.split(";").map((x) => x.trim()).filter(Boolean)) {
          try {
            db.exec(stmt);
          } catch (e) {
            if (!(e instanceof Error && e.message.includes("duplicate column name"))) throw e;
          }
        }
        db.exec(`PRAGMA user_version = ${version + 1}`);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      version++;
    }
  }
  db.exec(SCHEMA_SQL);
  if (version !== SCHEMA_VERSION) db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  seedIfEmpty(db);
  return db;
}

function getDb(): DatabaseSync {
  return (globalForDb.__formDb ??= open());
}

type Params = SQLInputValue[];

// node:sqlite returns null-prototype objects, which React cannot pass to Client Components.
const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;

export function all<T>(sql: string, ...params: Params): T[] {
  return getDb().prepare(sql).all(...params).map((r) => plain<T>(r));
}

export function get<T>(sql: string, ...params: Params): T | undefined {
  const r = getDb().prepare(sql).get(...params);
  return r === undefined ? undefined : plain<T>(r);
}

export function run(sql: string, ...params: Params): { changes: number; id: number } {
  const r = getDb().prepare(sql).run(...params);
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
}

let depth = 0;

/** Transacción reentrante: la externa usa BEGIN/COMMIT y las anidadas usan SAVEPOINT. */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  const name = `sp_${depth}`;
  db.exec(depth === 0 ? "BEGIN" : `SAVEPOINT ${name}`);
  depth++;
  try {
    const out = fn();
    depth--;
    db.exec(depth === 0 ? "COMMIT" : `RELEASE ${name}`);
    return out;
  } catch (e) {
    depth--;
    db.exec(depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${name}; RELEASE ${name}`);
    throw e;
  }
}
