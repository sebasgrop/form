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

## Reglas de diseño

- El historial nunca se reescribe: los registros guardan copias (objetivo del hábito, nombre del ejercicio, macros del alimento), los objetivos se versionan por fecha y los hábitos/rutinas se archivan en vez de borrarse.
- Los alimentos iniciales son valores aproximados de referencia (USDA) por 100 g, marcados como «aprox.»; editalos para que coincidan con tus etiquetas. Los productos de marca (whey, barras) no se precargan: creálos como alimentos propios.
- Valores supuestos que quizá quieras cambiar en Hábitos: agua 2500 ml, pasos 8000, fruta 2 porciones.
- El % de grasa corporal es solo manual, nunca se estima.
- La asignación de músculos a un ejercicio es un dato del ejercicio: si la corregís, el seguimiento por músculo se recalcula también para entrenamientos pasados.

Arquitectura y esquema: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tecnología

Next.js (App Router), TypeScript, Tailwind CSS v4, `node:sqlite` integrado en Node (22.13+ / 24), Recharts, lucide-react, Geist y zod. Diseño claro con acentos azul/celeste; interfaz en español.
