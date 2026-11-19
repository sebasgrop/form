# FORM — Arquitectura (local, un solo usuario)

## Stack
Next.js App Router · TypeScript estricto · Tailwind CSS v4 · `node:sqlite` (sin dependencias nativas) · Recharts · lucide-react · Geist · zod.

## Almacenamiento
- `data/form.db` — SQLite (WAL, claves foráneas activas). Se crea y carga sola en el primer arranque. `PRAGMA user_version` registra la versión del esquema (actual: 2); si una base anterior no coincide, la app avisa en vez de corromperla.
- `data/photos/` — fotos de progreso como archivos, servidas solo por una ruta API que valida el nombre contra la base.
- Copia de seguridad = copiar `data/`. Ambas rutas están en `.gitignore`.
- Límite: los datos viven solo en la máquina que ejecuta la app. Si en el futuro se quisiera sincronizar entre dispositivos, solo habría que cambiar la capa `src/lib/db`.

## Migraciones
`PRAGMA user_version` guarda la versión del esquema (actual: 3). Al abrir una base existente, `src/lib/db/index.ts` aplica en orden las migraciones de `MIGRATIONS` (cada una en una transacción) y antes crea un respaldo `data/backup-v<N>-*.db`. Una base nueva se crea directamente con `SCHEMA_SQL`. Cambios por versión:
- v2: catálogo de ejercicios y músculos.
- v6: `foods.reference` (tabla de origen de alimentos precargados, p. ej. ENNyS 2; único junto con el nombre).
- v5: platos (`dishes`, `dish_items`) y `meal_entries.dish_id`.
- v4: `foods.fdc_id` (id de USDA FoodData Central, único) para no duplicar alimentos importados.
- v3: `exercise_sets.kind` (`normal`, `warmup`, `failure`, `drop`) y `exercise_sets.duration_seconds` (series medidas por tiempo).

## Principios
- Los Server Components leen de SQLite vía `src/lib/db`; las mutaciones son Server Actions validadas con zod que terminan en `revalidatePath`.
- Islas de cliente solo para interacción (hábitos, series, diálogos, gráficos).
- **El historial no cambia solo**: los registros guardan copias (objetivo del hábito, nombre del ejercicio, macros), los objetivos se versionan por `effective_from` y hábitos/rutinas se archivan.
- Los días son fechas locales `YYYY-MM-DD`; los timestamps de SQLite son UTC y se convierten con `utcToLocalDate`.
- Interfaz en español (`es-AR`), tema claro con acentos celeste (`#0EA5E9`) y azul (`#0369A1`) definidos como tokens en `globals.css`; los colores de gráficos están en `src/lib/theme.ts`.

## Esquema (resumen; DDL en `src/lib/db/schema.ts`)
| Tabla | Propósito |
|---|---|
| profile | edad, sexo, altura, peso inicial, objetivo (una fila) |
| user_goals | calorías/proteínas/carbohidratos/grasas versionados por fecha |
| habits / habit_logs | definición del hábito y un registro por hábito y día (con copia del objetivo) |
| muscles | 19 músculos con grupo muscular |
| exercise_catalog | catálogo de ejercicios (54 precargados + propios) |
| exercise_muscles | ejercicio ↔ músculo con `role` = `primary` o `secondary` |
| workout_templates / workout_exercises | rutinas editables; cada ejercicio apunta al catálogo (`catalog_id`) |
| workout_sessions / exercise_sets | entrenamientos reales; cada serie guarda `catalog_id` y el nombre del ejercicio |
| foods / meal_entries | biblioteca de alimentos y comidas registradas (macros copiados al registrar) |
| body_measurements / progress_photos | medidas por fecha y fotos privadas |

Integridad: restricciones CHECK, claves foráneas, índices UNIQUE y timestamps `created_at`/`updated_at`.

## Seguimiento por músculo
Pantalla `/training/muscles` (cálculo en `src/features/training/progress.ts`). Recorre `exercise_sets.catalog_id → exercise_muscles → muscles` sobre entrenamientos terminados y muestra, por músculo y por grupo, en las últimas 4/8/12 semanas y frente al período anterior de igual largo: series principales, series accesorias, volumen (peso × repeticiones), carga máxima y evolución semanal.
- Volumen y carga máxima cuentan solo series donde el músculo es principal; las accesorias se muestran aparte.
- Un grupo cuenta cada serie una sola vez (principal si algún músculo del grupo es principal en ese ejercicio).
- Las semanas empiezan el lunes. Las series de ejercicios sin vínculo al catálogo no se cuentan.
- Las series de calentamiento (`kind = 'warmup'`) se excluyen de todos los cálculos (series, volumen, carga, historial y «última vez»).

## Platos
`dishes` (nombre único, porciones que rinde) y `dish_items` (alimento + cantidad en la unidad del alimento). Los macros del plato se calculan al leer, a partir de los alimentos actuales; por eso editar un alimento actualiza el plato. Registrar un plato crea una sola fila en `meal_entries` con los macros por porción × porciones copiados (`serving_unit = 'porción'`, `dish_id` solo para trazabilidad, `ON DELETE SET NULL`), de modo que el historial no cambia si se edita o borra el plato.

## Integración con USDA
`src/features/nutrition/usda.ts` consulta `POST /fdc/v1/foods/search` con la clave de `USDA_API_KEY` (solo servidor, cabecera `X-Api-Key`, nunca en mensajes de error). Energía: nutriente 1008 o, si falta, 2047/2048 (Atwater); proteínas 1003, carbohidratos 1005, grasas 1004. Los valores que USDA no informa se dejan vacíos para completarlos a mano. El alimento se guarda como propio (`source = custom`) con su `fdc_id`.

## Decisiones clave
- Pasos, sueño y agua son hábitos numéricos con `system_key`; el Panel lee de `habit_logs`. «Alcanzar objetivo de proteínas» y «Completar entrenamiento» se completan solos desde Nutrición y Entrenamiento.
- Alimentos iniciales aproximados y marcados como tales; nunca se inventan valores desconocidos.
- La grasa corporal es solo manual.
