# FORM

Seguimiento personal de hábitos, entrenamiento, alimentación y evolución física. Todo se guarda localmente en un archivo SQLite: no hay cuentas, servidores ni servicios en la nube.

## Cómo usarla

```bash
npm install
npm run build
npm start        # http://localhost:3000
```

Para desarrollar con recarga en caliente: `npm run dev`.

Para abrirla desde el celular en la misma wifi: `npm start -- -H 0.0.0.0` y entrá a `http://<ip-de-tu-pc>:3000`. No tiene login, así que hacelo solo en una red de confianza.

## Tus datos

- `data/form.db`: base SQLite (se crea y se carga con datos iniciales la primera vez).
- `data/photos/`: fotos de progreso (solo se sirven por `/api/photos/...`).
- **Copia de seguridad = copiar la carpeta `data/`.** En Ajustes también hay un botón para exportar todo a JSON.
- Con la variable `FORM_DATA_DIR` podés guardar los datos en otra carpeta.

## Secciones

| Sección | Qué hace |
|---|---|
| Panel | Resumen del día, métricas, checklist de hábitos, alimentación vs. objetivos, resumen semanal, evolución del peso, registro rápido de peso y agua |
| Hábitos | Hábitos sí/no y numéricos, frecuencia, rachas, % de cumplimiento, historial de 28 días, edición y archivo, carga de días pasados |
| Entrenamiento | Rutinas editables, registro de series editables, último rendimiento por ejercicio, historial y **biblioteca de ejercicios con músculos** |
| Nutrición | Desayuno/almuerzo/merienda/cena, biblioteca de alimentos propios, objetivos editables, gráfico de calorías |
| Cuerpo | Peso y medidas, gráficos, historial, comparación de fechas, fotos privadas |
| Ajustes | Perfil, objetivos, carpeta de datos, exportación JSON |

## Ejercicios y músculos

Cada ejercicio del catálogo (54 precargados, editables) tiene **músculos principales** y **músculos accesorios** sobre una lista de 19 músculos agrupados (Pecho, Espalda, Hombros, Brazos, Core, Piernas). Al agregar un ejercicio a una rutina o a un entrenamiento se busca en el catálogo; si es nuevo, se piden sus músculos y se suma al catálogo.

Cada serie registrada guarda el vínculo con su ejercicio de catálogo (`exercise_sets.catalog_id`). Con eso, **Entrenamiento → Progreso por músculo** muestra por músculo y por grupo (últimas 4, 8 o 12 semanas, comparado con el período anterior): series principales y accesorias, volumen, carga máxima y evolución semanal.

## Buscar alimentos en USDA FoodData Central

En **Nutrición → Biblioteca de alimentos → USDA** podés buscar entre miles de alimentos con su información nutricional (por 100 g) y agregarlos a tu biblioteca.

1. Conseguí una clave gratis en <https://fdc.nal.usda.gov/api-key-signup>.
2. Copiá `.env.example` como `.env.local` y completá `USDA_API_KEY=tu_clave`. Ese archivo no se sube a git.
3. Reiniciá la app (`npm run dev` o `npm start`).

La clave la usa solo el servidor: nunca llega al navegador. Detalles:
- La base de USDA está en inglés, así que se busca en inglés (por ejemplo `chicken breast`). Al agregar un alimento podés cambiarle el nombre.
- Por defecto se buscan alimentos genéricos (Foundation, SR Legacy y FNDDS); también hay productos de marca de EE. UU.
- Si USDA no informa algún valor (calorías, proteínas, carbohidratos o grasas), queda vacío para que lo completes: no se inventan valores.
- Cada alimento importado guarda su id de USDA, por lo que no se duplica, y muestra la etiqueta «USDA».

## Importar el historial de Strong

Con una exportación CSV de la app Strong (Ajustes → Exportar datos):

```bash
node scripts/import-strong.mjs "C:\ruta\strong_workouts.csv" --dry-run   # solo valida
node scripts/import-strong.mjs "C:\ruta\strong_workouts.csv"             # importa
```

- Antes de escribir crea una copia de la base en `data/backup-pre-strong-*.db`.
- Es idempotente: volver a correrlo no duplica entrenamientos.
- Los ejercicios se traducen y se vinculan al catálogo con sus músculos (mapa en `scripts/strong-exercises.mjs`; si el CSV trae un ejercicio nuevo, el script avisa y hay que agregarlo ahí).
- Tipos de serie: `P` = calentamiento, `F` = al fallo, `S` = descendente. Los calentamientos se guardan pero no cuentan en el progreso por músculo, el volumen ni el historial.
- Se asume que los pesos están en kg. El RPE no se importa.
- Los entrenamientos importados quedan con la nota «Importado de Strong» y sin rutina asociada.

## Reglas de diseño

- El historial nunca se reescribe: los registros guardan copias (objetivo del hábito, nombre del ejercicio, macros del alimento), los objetivos se versionan por fecha y los hábitos/rutinas se archivan en vez de borrarse.
- Los alimentos iniciales son valores aproximados de referencia (USDA) por 100 g, marcados como «aprox.»; editalos para que coincidan con tus etiquetas. Los productos de marca (whey, barras) no se precargan: creálos como alimentos propios.
- Valores supuestos que quizá quieras cambiar en Hábitos: agua 2500 ml, pasos 8000, fruta 2 porciones.
- El % de grasa corporal es solo manual, nunca se estima.
- La asignación de músculos a un ejercicio es un dato del ejercicio: si la corregís, el seguimiento por músculo se recalcula también para entrenamientos pasados.

Arquitectura y esquema: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tecnología

Next.js (App Router), TypeScript, Tailwind CSS v4, `node:sqlite` integrado en Node (22.13+ / 24), Recharts, lucide-react, Geist y zod. Diseño claro con acentos azul/celeste; interfaz en español.
