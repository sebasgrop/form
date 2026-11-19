import type { DatabaseSync } from "node:sqlite";
import { EXERCISES, MUSCLES } from "./catalog-data";

// Datos iniciales, insertados una sola vez como filas propias (editables) del usuario.
// Supuestos a revisar: agua 2500 ml, pasos 8000, fruta 2 porciones.

type HabitSeed = {
  name: string;
  category: "nutrition" | "activity" | "recovery" | "wellbeing";
  type: "boolean" | "numeric";
  target?: number;
  max?: number;
  unit?: string;
  days?: string;
  key?: string;
};

const HABITS: HabitSeed[] = [
  { name: "Alcanzar objetivo de proteínas", category: "nutrition", type: "boolean", key: "protein_goal" },
  { name: "Tomar suficiente agua", category: "nutrition", type: "numeric", target: 2500, unit: "ml", key: "water" },
  { name: "Comer al menos dos frutas", category: "nutrition", type: "numeric", target: 2, unit: "porciones" },
  { name: "Consumir verduras", category: "nutrition", type: "boolean" },
  { name: "Completar entrenamiento programado", category: "activity", type: "boolean", days: "1,2,4,5", key: "workout_completed" },
  { name: "Alcanzar objetivo de pasos", category: "activity", type: "numeric", target: 8000, unit: "pasos", key: "steps" },
  { name: "Realizar movilidad", category: "activity", type: "boolean" },
  { name: "Dormir entre 7 y 9 horas", category: "recovery", type: "numeric", target: 7, max: 9, unit: "horas", key: "sleep" },
  { name: "Mantener horario regular de sueño", category: "recovery", type: "boolean" },
  { name: "Exponerse a luz natural", category: "recovery", type: "boolean" },
  { name: "Reducir tiempo de pantalla", category: "wellbeing", type: "boolean" },
  { name: "Planificar comidas", category: "wellbeing", type: "boolean" },
];

type ExSeed = [name: string, catalog: string, sets: number, repMin: number, repMax: number];

// El nombre del ejercicio de la rutina puede diferir del catálogo (ej. "Sentadilla o sentadilla en máquina").
const ROUTINE: { name: string; dow: number; exercises: ExSeed[] }[] = [
  {
    name: "Tren superior A",
    dow: 1,
    exercises: [
      ["Press de banca", "Press de banca", 3, 6, 10],
      ["Remo con barra", "Remo con barra", 3, 8, 12],
      ["Press inclinado con mancuernas", "Press inclinado con mancuernas", 3, 8, 12],
      ["Jalón al pecho", "Jalón al pecho", 3, 8, 12],
      ["Elevaciones laterales", "Elevaciones laterales", 3, 12, 15],
      ["Curl de bíceps", "Curl de bíceps", 2, 10, 15],
      ["Extensión de tríceps en polea", "Extensión de tríceps en polea", 2, 10, 15],
    ],
  },
  {
    name: "Tren inferior A",
    dow: 2,
    exercises: [
      ["Prensa de piernas", "Prensa de piernas", 3, 8, 12],
      ["Peso muerto rumano", "Peso muerto rumano", 3, 8, 12],
      ["Extensión de cuádriceps", "Extensión de cuádriceps", 3, 10, 15],
      ["Curl femoral", "Curl femoral", 3, 10, 15],
      ["Elevación de gemelos de pie", "Elevación de gemelos de pie", 3, 12, 15],
      ["Crunch en polea", "Crunch en polea", 3, 12, 15],
    ],
  },
  {
    name: "Tren superior B",
    dow: 4,
    exercises: [
      ["Jalón al pecho", "Jalón al pecho", 3, 8, 12],
      ["Press inclinado con barra", "Press inclinado con barra", 3, 8, 12],
      ["Remo sentado en polea", "Remo sentado en polea", 3, 8, 12],
      ["Press de hombros con mancuernas", "Press de hombros con mancuernas", 2, 8, 12],
      ["Aperturas en polea", "Aperturas en polea", 2, 12, 15],
      ["Curl martillo", "Curl martillo", 3, 10, 15],
      ["Extensión de tríceps sobre la cabeza", "Extensión de tríceps sobre la cabeza", 3, 10, 15],
    ],
  },
  {
    name: "Tren inferior B",
    dow: 5,
    exercises: [
      ["Sentadilla o sentadilla en máquina", "Sentadilla", 3, 8, 12],
      ["Hip thrust", "Hip thrust", 3, 8, 12],
      ["Curl femoral sentado", "Curl femoral sentado", 3, 10, 15],
      ["Extensión de cuádriceps", "Extensión de cuádriceps", 2, 12, 15],
      ["Elevación de gemelos de pie", "Elevación de gemelos de pie", 3, 12, 15],
      ["Elevación de piernas", "Elevación de piernas", 3, 12, 15],
    ],
  },
];

// Valores aproximados de referencia (USDA) por 100 g/ml, marcados como "seed_approx" y editables.
// No se cargan productos que dependen de la marca (whey, barras...): crealos como alimentos propios.
const FOODS: [name: string, unit: string, kcal: number, p: number, c: number, f: number][] = [
  ["Pechuga de pollo cocida", "g", 165, 31, 0, 3.6],
  ["Huevo entero", "g", 143, 12.6, 0.7, 9.5],
  ["Arroz blanco cocido", "g", 130, 2.7, 28, 0.3],
  ["Pasta cocida", "g", 158, 5.8, 30.9, 0.9],
  ["Avena (seca)", "g", 389, 16.9, 66.3, 6.9],
  ["Papa hervida", "g", 87, 1.9, 20.1, 0.1],
  ["Banana", "g", 89, 1.1, 22.8, 0.3],
  ["Manzana", "g", 52, 0.3, 13.8, 0.2],
  ["Leche entera", "ml", 61, 3.2, 4.8, 3.3],
  ["Yogur griego natural descremado", "g", 59, 10.2, 3.6, 0.4],
  ["Salmón de cultivo cocido", "g", 208, 20.4, 0, 13.4],
  ["Carne picada magra 90% (cruda)", "g", 176, 20, 0, 10],
  ["Aceite de oliva", "ml", 884, 0, 0, 100],
];

export function seedIfEmpty(db: DatabaseSync): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM profile").get() as { n: number };
  if (row.n > 0) return;

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO profile (id, age_years, sex, height_cm, start_weight_kg, goal) VALUES (1, 20, 'male', 182, 80, ?)",
    ).run("Ganar masa muscular y reducir grasa corporal");

    db.prepare(
      "INSERT INTO user_goals (effective_from, calories, protein_g, carbs_g, fat_g) VALUES ('1970-01-01', 2600, 160, 330, 75)",
    ).run();

    const insHabit = db.prepare(
      `INSERT INTO habits (name, category, type, target_value, target_max, unit, days_of_week, system_key, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    HABITS.forEach((h, i) =>
      insHabit.run(h.name, h.category, h.type, h.target ?? null, h.max ?? null, h.unit ?? null, h.days ?? "1,2,3,4,5,6,7", h.key ?? null, i + 1),
    );

    // músculos y catálogo de ejercicios
    const insMuscle = db.prepare("INSERT INTO muscles (key, name, muscle_group, sort_order) VALUES (?, ?, ?, ?)");
    MUSCLES.forEach((m, i) => insMuscle.run(m[0], m[1], m[2], i + 1));
    const muscleId = new Map(
      (db.prepare("SELECT id, key FROM muscles").all() as { id: number; key: string }[]).map((m) => [m.key, m.id]),
    );
    const insEx = db.prepare("INSERT INTO exercise_catalog (name, source) VALUES (?, 'seed')");
    const insLink = db.prepare("INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES (?, ?, ?)");
    const catalogId = new Map<string, number>();
    for (const [name, primary, secondary] of EXERCISES) {
      const id = Number(insEx.run(name).lastInsertRowid);
      catalogId.set(name, id);
      primary.forEach((k) => insLink.run(id, muscleId.get(k)!, "primary"));
      secondary.forEach((k) => insLink.run(id, muscleId.get(k)!, "secondary"));
    }

    // rutina
    const insTpl = db.prepare("INSERT INTO workout_templates (name, day_of_week, sort_order) VALUES (?, ?, ?)");
    const insRoutineEx = db.prepare(
      "INSERT INTO workout_exercises (template_id, catalog_id, name, target_sets, rep_min, rep_max, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    ROUTINE.forEach((t, ti) => {
      const { lastInsertRowid } = insTpl.run(t.name, t.dow, ti + 1);
      t.exercises.forEach((e, ei) => {
        const cid = catalogId.get(e[1]);
        if (cid == null) throw new Error(`Ejercicio de catálogo inexistente: ${e[1]}`);
        insRoutineEx.run(Number(lastInsertRowid), cid, e[0], e[2], e[3], e[4], ei + 1);
      });
    });

    const insFood = db.prepare(
      "INSERT INTO foods (name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source) VALUES (?, 100, ?, ?, ?, ?, ?, 'seed_approx')",
    );
    FOODS.forEach((f) => insFood.run(f[0], f[1], f[2], f[3], f[4], f[5]));

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
