// Mapa de ejercicios de Strong -> catálogo de FORM (nombre en español y músculos).
//
// - e(strong, español):            ya existe en el catálogo precargado; se reutiliza con sus músculos.
// - n(strong, español, P, S):      ejercicio nuevo; P = músculos principales, S = accesorios.
//
// Claves de músculos: pectoral, dorsal, espalda_media, trapecio, lumbar, deltoide_anterior,
// deltoide_lateral, deltoide_posterior, biceps, braquial, triceps, antebrazo, abdominales,
// oblicuos, cuadriceps, isquiotibiales, gluteos, aductores, pantorrillas.

const e = (strong, es) => ({ strong, es, muscles: null });
const n = (strong, es, primary, secondary = []) => ({ strong, es, muscles: { primary, secondary } });

export const STRONG_EXERCISES = [
  // Pecho
  e("Bench Press (Barbell)", "Press de banca"),
  e("Incline Bench Press (Barbell)", "Press inclinado con barra"),
  e("Incline Bench Press (Dumbbell)", "Press inclinado con mancuernas"),
  e("Bench Press (Dumbbell)", "Press de pecho con mancuernas"),
  e("Chest Press (Machine)", "Press de pecho en máquina"),
  e("Chest Dip", "Fondos en paralelas"),
  e("Push Up", "Flexiones de brazos"),
  n("Incline Chest Press (Machine)", "Press inclinado en máquina", ["pectoral"], ["deltoide_anterior", "triceps"]),
  n("Incline Bench Press (Smith Machine)", "Press inclinado en multipower", ["pectoral"], ["deltoide_anterior", "triceps"]),
  n("Bench Press - Close Grip (Barbell)", "Press de banca agarre cerrado", ["triceps", "pectoral"], ["deltoide_anterior"]),
  n("Cable Crossover", "Cruce de poleas", ["pectoral"], ["deltoide_anterior"]),
  n("cable crossover inferior", "Cruce de poleas inferior", ["pectoral"], ["deltoide_anterior"]),
  n("Chest Fly", "Aperturas de pecho", ["pectoral"], ["deltoide_anterior"]),
  n("Pec Deck (Machine)", "Pec deck", ["pectoral"], ["deltoide_anterior"]),
  n("Incline Chest Fly (Dumbbell)", "Aperturas inclinadas con mancuernas", ["pectoral"], ["deltoide_anterior"]),
  n("Chest Dip (Assisted)", "Fondos en paralelas asistidos", ["pectoral", "triceps"], ["deltoide_anterior"]),

  // Espalda
  e("Lat Pulldown (Cable)", "Jalón al pecho"),
  e("Pull Up", "Dominadas"),
  e("Bent Over Row (Barbell)", "Remo con barra"),
  e("Bent Over One Arm Row (Dumbbell)", "Remo con mancuerna"),
  e("Seated Row (Cable)", "Remo sentado en polea"),
  e("Seated Row (Machine)", "Remo en máquina"),
  e("Shrug (Barbell)", "Encogimientos de hombros"),
  e("Deadlift (Barbell)", "Peso muerto"),
  e("Romanian Deadlift (Barbell)", "Peso muerto rumano"),
  n("Lat Pulldown (Machine)", "Jalón al pecho en máquina", ["dorsal"], ["biceps", "braquial", "espalda_media"]),
  n("Lat Pulldown (Single Arm)", "Jalón al pecho a una mano", ["dorsal"], ["biceps", "braquial", "espalda_media"]),
  n("Chin Up", "Dominadas supinas", ["dorsal", "biceps"], ["braquial", "espalda_media"]),
  // En Strong este ejercicio se registraba como "Pullover (Dumbbell)" pero en realidad era pullover en polea.
  e("Pullover (Dumbbell)", "Pullover en polea"),
  n("Incline Row (Dumbbell)", "Remo en banco inclinado con mancuernas", ["espalda_media", "dorsal"], ["biceps", "deltoide_posterior"]),
  n("Remo T", "Remo en T", ["espalda_media", "dorsal"], ["biceps", "deltoide_posterior", "lumbar"]),
  n("REMO A UNA MANO", "Remo a una mano", ["dorsal", "espalda_media"], ["biceps", "deltoide_posterior"]),
  n("Bent Over Row (Dumbbell)", "Remo inclinado con mancuernas", ["dorsal", "espalda_media"], ["biceps", "deltoide_posterior"]),
  n("Inverted Row (Bodyweight)", "Remo invertido", ["espalda_media", "dorsal"], ["biceps", "deltoide_posterior"]),
  n("Shrug (Machine)", "Encogimientos en máquina", ["trapecio"], ["antebrazo"]),
  n("Shrug (Dumbbell)", "Encogimientos con mancuernas", ["trapecio"], ["antebrazo"]),
  n("Deficit Deadlift (Barbell)", "Peso muerto con déficit", ["gluteos", "isquiotibiales", "lumbar"], ["espalda_media", "trapecio", "cuadriceps", "antebrazo"]),
  n("Deadlift (Smith Machine)", "Peso muerto en multipower", ["gluteos", "isquiotibiales", "lumbar"], ["espalda_media", "trapecio", "cuadriceps"]),
  n("Deadlift (Dumbbell)", "Peso muerto con mancuernas", ["gluteos", "isquiotibiales", "lumbar"], ["espalda_media", "trapecio", "cuadriceps", "antebrazo"]),

  // Hombros
  e("Lateral Raise (Dumbbell)", "Elevaciones laterales"),
  e("Overhead Press (Barbell)", "Press militar"),
  e("Front Raise (Dumbbell)", "Elevaciones frontales"),
  n("Lateral Raise (Cable)", "Elevaciones laterales en polea", ["deltoide_lateral"], ["trapecio"]),
  n("lateral raise parado", "Elevaciones laterales de pie", ["deltoide_lateral"], ["trapecio"]),
  n("Front Raise (Cable)", "Elevaciones frontales en polea", ["deltoide_anterior"], ["deltoide_lateral"]),
  n("Arnold Press (Dumbbell)", "Press Arnold", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]),
  n("Shoulder Press (Machine)", "Press de hombros en máquina", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]),
  n("press de hombros maquina nueva", "Press de hombros en máquina (nueva)", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]),
  n("Shoulder Press (Plate Loaded)", "Press de hombros en máquina con discos", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]),
  n("Reverse Fly (Machine)", "Pájaros en máquina", ["deltoide_posterior"], ["espalda_media", "trapecio"]),
  n("pike push up", "Flexiones pike", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]),

  // Brazos
  e("Bicep Curl (Dumbbell)", "Curl de bíceps"),
  e("Bicep Curl (Cable)", "Curl en polea"),
  e("Hammer Curl (Dumbbell)", "Curl martillo"),
  e("Preacher Curl (Dumbbell)", "Curl predicador"),
  e("Triceps Pushdown (Cable - Straight Bar)", "Extensión de tríceps en polea"),
  e("Skullcrusher (Barbell)", "Press francés"),
  n("Bicep Curl (Barbell)", "Curl de bíceps con barra", ["biceps"], ["braquial", "antebrazo"]),
  n("Bicep Curl (Machine)", "Curl de bíceps en máquina", ["biceps"], ["braquial"]),
  n("Hammer Curl (Cable)", "Curl martillo en polea", ["braquial"], ["biceps", "antebrazo"]),
  n("Incline Curl (Dumbbell)", "Curl inclinado con mancuernas", ["biceps"], ["braquial"]),
  n("Preacher Curl (Barbell)", "Curl predicador con barra", ["biceps"], ["braquial"]),
  n("Preacher Curl (Machine)", "Curl predicador en máquina", ["biceps"], ["braquial"]),
  n("doble bicep en polea", "Doble bíceps en polea", ["biceps"], ["braquial"]),
  n("Reverse Curl (Dumbbell)", "Curl inverso con mancuernas", ["braquial", "antebrazo"], ["biceps"]),
  n("Reverse Curl (Barbell)", "Curl inverso con barra", ["braquial", "antebrazo"], ["biceps"]),
  n("Triceps Extension (Cable)", "Extensión de tríceps sobre la cabeza en polea", ["triceps"]),
  n("Triceps Extension (Dumbbell)", "Extensión de tríceps con mancuerna", ["triceps"]),
  n("Triceps Extension (Barbell)", "Extensión de tríceps con barra", ["triceps"]),
  n("Triceps Extension", "Extensión de tríceps", ["triceps"]),
  n("tricep a una mano", "Tríceps a una mano", ["triceps"]),
  n("triceps extension una mano", "Extensión de tríceps a una mano", ["triceps"]),
  n("TRICEPS CON DOS SOGAS", "Tríceps con dos sogas", ["triceps"]),
  n("Skullcrusher (Dumbbell)", "Press francés con mancuernas", ["triceps"]),
  n("Triceps Dip (Assisted)", "Fondos de tríceps asistidos", ["triceps"], ["pectoral", "deltoide_anterior"]),

  // Piernas
  e("Squat (Barbell)", "Sentadilla"),
  e("Leg Press", "Prensa de piernas"),
  e("Leg Extension (Machine)", "Extensión de cuádriceps"),
  e("Seated Leg Curl (Machine)", "Curl femoral sentado"),
  e("Hip Adductor (Machine)", "Aducción de cadera en máquina"),
  e("Hip Abductor (Machine)", "Abducción de cadera en máquina"),
  e("Seated Calf Raise (Plate Loaded)", "Elevación de gemelos sentado"),
  e("Lunge (Bodyweight)", "Zancadas"),
  e("Bulgarian Split Squat", "Sentadilla búlgara"),
  n("Squat (Bodyweight)", "Sentadilla con peso corporal", ["cuadriceps", "gluteos"], ["isquiotibiales", "aductores"]),
  n("Jump Squat", "Sentadilla con salto", ["cuadriceps", "gluteos"], ["pantorrillas", "isquiotibiales"]),
  n("Seated Leg Press (Machine)", "Prensa de piernas sentado", ["cuadriceps"], ["gluteos", "aductores", "isquiotibiales"]),
  n("Lying Leg Curl (Machine)", "Curl femoral acostado", ["isquiotibiales"], ["pantorrillas"]),
  n("Calf Press on Leg Press", "Elevación de gemelos en prensa", ["pantorrillas"]),
  n("Standing Calf Raise (Dumbbell)", "Elevación de gemelos de pie con mancuerna", ["pantorrillas"]),
  n("Standing Calf Raise (Smith Machine)", "Elevación de gemelos de pie en multipower", ["pantorrillas"]),
  n("gemelos", "Gemelos", ["pantorrillas"]),

  // Core y cardio
  n("Crunch (Machine)", "Crunch en máquina", ["abdominales"], ["oblicuos"]),
  n("Side Plank", "Plancha lateral", ["oblicuos"], ["abdominales"]),
  n("Hanging Knee Raise", "Elevación de rodillas colgado", ["abdominales"], ["oblicuos", "antebrazo"]),
  n("Cycling (Indoor)", "Bicicleta fija", ["cuadriceps"], ["gluteos", "isquiotibiales", "pantorrillas"]),
];
