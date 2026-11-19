// Catálogo inicial de músculos y ejercicios. Todo es editable desde la app.
// Cada ejercicio tiene músculos principales y accesorios (sinergistas), pensado para
// poder medir luego el volumen/progreso por músculo y por grupo muscular.

export const MUSCLES = [
  // key, nombre, grupo
  ["pectoral", "Pectoral", "Pecho"],
  ["dorsal", "Dorsal", "Espalda"],
  ["espalda_media", "Espalda media (romboides)", "Espalda"],
  ["trapecio", "Trapecio", "Espalda"],
  ["lumbar", "Zona lumbar", "Espalda"],
  ["deltoide_anterior", "Deltoides anterior", "Hombros"],
  ["deltoide_lateral", "Deltoides lateral", "Hombros"],
  ["deltoide_posterior", "Deltoides posterior", "Hombros"],
  ["biceps", "Bíceps", "Brazos"],
  ["braquial", "Braquial", "Brazos"],
  ["triceps", "Tríceps", "Brazos"],
  ["antebrazo", "Antebrazo", "Brazos"],
  ["abdominales", "Abdominales", "Core"],
  ["oblicuos", "Oblicuos", "Core"],
  ["cuadriceps", "Cuádriceps", "Piernas"],
  ["isquiotibiales", "Isquiotibiales", "Piernas"],
  ["gluteos", "Glúteos", "Piernas"],
  ["aductores", "Aductores", "Piernas"],
  ["pantorrillas", "Pantorrillas", "Piernas"],
] as const;

export type MuscleKey = (typeof MUSCLES)[number][0];

type Ex = [name: string, primary: MuscleKey[], secondary: MuscleKey[]];

export const EXERCISES: Ex[] = [
  // Pecho
  ["Press de banca", ["pectoral"], ["deltoide_anterior", "triceps"]],
  ["Press inclinado con barra", ["pectoral"], ["deltoide_anterior", "triceps"]],
  ["Press inclinado con mancuernas", ["pectoral"], ["deltoide_anterior", "triceps"]],
  ["Press de pecho con mancuernas", ["pectoral"], ["deltoide_anterior", "triceps"]],
  ["Press de pecho en máquina", ["pectoral"], ["deltoide_anterior", "triceps"]],
  ["Aperturas en polea", ["pectoral"], ["deltoide_anterior"]],
  ["Aperturas con mancuernas", ["pectoral"], ["deltoide_anterior"]],
  ["Fondos en paralelas", ["pectoral", "triceps"], ["deltoide_anterior"]],
  ["Flexiones de brazos", ["pectoral"], ["deltoide_anterior", "triceps", "abdominales"]],
  // Espalda
  ["Jalón al pecho", ["dorsal"], ["biceps", "braquial", "espalda_media"]],
  ["Dominadas", ["dorsal"], ["biceps", "braquial", "espalda_media"]],
  ["Remo con barra", ["dorsal", "espalda_media"], ["biceps", "deltoide_posterior", "lumbar"]],
  ["Remo con mancuerna", ["dorsal", "espalda_media"], ["biceps", "deltoide_posterior"]],
  ["Remo sentado en polea", ["espalda_media", "dorsal"], ["biceps", "deltoide_posterior"]],
  ["Remo en máquina", ["espalda_media", "dorsal"], ["biceps", "deltoide_posterior"]],
  ["Pullover en polea", ["dorsal"], ["triceps"]],
  ["Peso muerto", ["gluteos", "isquiotibiales", "lumbar"], ["espalda_media", "trapecio", "cuadriceps", "antebrazo"]],
  ["Hiperextensiones", ["lumbar"], ["gluteos", "isquiotibiales"]],
  ["Encogimientos de hombros", ["trapecio"], ["antebrazo"]],
  ["Face pull", ["deltoide_posterior"], ["espalda_media", "trapecio"]],
  // Hombros
  ["Press militar", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]],
  ["Press de hombros con mancuernas", ["deltoide_anterior"], ["deltoide_lateral", "triceps"]],
  ["Elevaciones laterales", ["deltoide_lateral"], ["trapecio"]],
  ["Elevaciones frontales", ["deltoide_anterior"], ["deltoide_lateral"]],
  ["Pájaros (elevaciones posteriores)", ["deltoide_posterior"], ["espalda_media", "trapecio"]],
  // Brazos
  ["Curl de bíceps", ["biceps"], ["braquial", "antebrazo"]],
  ["Curl martillo", ["braquial"], ["biceps", "antebrazo"]],
  ["Curl predicador", ["biceps"], ["braquial"]],
  ["Curl en polea", ["biceps"], ["braquial", "antebrazo"]],
  ["Extensión de tríceps en polea", ["triceps"], []],
  ["Extensión de tríceps sobre la cabeza", ["triceps"], []],
  ["Press francés", ["triceps"], []],
  ["Fondos en banco", ["triceps"], ["pectoral", "deltoide_anterior"]],
  ["Curl de muñeca", ["antebrazo"], []],
  // Piernas
  ["Sentadilla", ["cuadriceps", "gluteos"], ["isquiotibiales", "aductores", "lumbar", "abdominales"]],
  ["Sentadilla en máquina", ["cuadriceps"], ["gluteos", "aductores"]],
  ["Sentadilla búlgara", ["cuadriceps", "gluteos"], ["isquiotibiales", "aductores"]],
  ["Zancadas", ["cuadriceps", "gluteos"], ["isquiotibiales", "aductores"]],
  ["Prensa de piernas", ["cuadriceps"], ["gluteos", "aductores", "isquiotibiales"]],
  ["Peso muerto rumano", ["isquiotibiales", "gluteos"], ["lumbar", "antebrazo"]],
  ["Extensión de cuádriceps", ["cuadriceps"], []],
  ["Curl femoral", ["isquiotibiales"], ["pantorrillas"]],
  ["Curl femoral sentado", ["isquiotibiales"], ["pantorrillas"]],
  ["Hip thrust", ["gluteos"], ["isquiotibiales", "aductores"]],
  ["Abducción de cadera en máquina", ["gluteos"], []],
  ["Aducción de cadera en máquina", ["aductores"], []],
  ["Elevación de gemelos de pie", ["pantorrillas"], []],
  ["Elevación de gemelos sentado", ["pantorrillas"], []],
  // Core
  ["Crunch en polea", ["abdominales"], ["oblicuos"]],
  ["Crunch abdominal", ["abdominales"], ["oblicuos"]],
  ["Elevación de piernas", ["abdominales"], ["oblicuos"]],
  ["Plancha", ["abdominales"], ["oblicuos", "lumbar", "deltoide_anterior"]],
  ["Giros rusos", ["oblicuos"], ["abdominales"]],
  ["Rueda abdominal", ["abdominales"], ["dorsal", "deltoide_anterior"]],
];
