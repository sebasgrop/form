// Tipos compartidos entre servidor y cliente (sin dependencias de servidor).
export type Muscle = { id: number; key: string; name: string; muscle_group: string };

export type CatalogExercise = {
  id: number;
  name: string;
  source: "seed" | "custom";
  primary: Muscle[];
  secondary: Muscle[];
};
