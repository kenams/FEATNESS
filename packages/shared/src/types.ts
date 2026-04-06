export type IntensityLevel = "light" | "moderate" | "intense";

export type SportKey =
  | "running"
  | "cycling"
  | "strength"
  | "hiit"
  | "yoga"
  | "football"
  | "basketball"
  | "swimming"
  | "rowing";

export type GoalKey = "hydration" | "recovery" | "performance";

export type PrimaryObjectiveKey =
  | "lose_weight"
  | "maintain"
  | "gain_muscle"
  | "improve_endurance";

export type UserWorkoutInput = {
  sport: SportKey;
  intensity: IntensityLevel;
  durationMin: number;
  weightKg: number;
  goal: GoalKey;
};

export type ActivityPreset = {
  key: SportKey;
  label: string;
  metValues: Record<IntensityLevel, number>;
};

export type NutritionRecommendation = {
  caloriesBurned: number;
  hydrationMl: number;
  carbsG: number;
  proteinG: number;
  electrolytesMg: number;
  recommendedBlend: string;
  recommendationSummary: string;
};

export type PreparationStatus =
  | "pending"
  | "scanned"
  | "queued"
  | "mixing"
  | "ready"
  | "completed";

export type DispenseTokenStatus =
  | "active"
  | "confirmed"
  | "consumed"
  | "expired"
  | "cancelled";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  primaryObjective: PrimaryObjectiveKey | null;
  gymName: string | null;
  preferredSport: SportKey | null;
  preferredGoal: GoalKey | null;
  favoriteMealIds: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BmiInsight = {
  bmi: number;
  category: "underweight" | "healthy" | "overweight" | "obesity";
  label: string;
};

export type SessionSuggestion = {
  key: string;
  title: string;
  description: string;
  why: string;
  sport: SportKey;
  intensity: IntensityLevel;
  durationMin: number;
  goal: GoalKey;
  estimatedCaloriesBurned?: number;
  effortCategory?: "light" | "medium" | "intense";
  focusTitle?: string;
  focusCopy?: string;
};

export type WorkoutSessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  workout: UserWorkoutInput;
  recommendation: NutritionRecommendation;
  preparationStatus: PreparationStatus;
  selectedMealBlendId: string | null;
  isFavorite: boolean;
};

export type DispenseTokenRecord = {
  id: string;
  userId: string;
  sessionId: string;
  status: DispenseTokenStatus;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type KioskScanPayload = {
  token: DispenseTokenRecord;
  session: WorkoutSessionRecord;
  profile: Pick<UserProfile, "id" | "email" | "fullName" | "gymName"> | null;
};

export type KioskOrderStatus = PreparationStatus;

export type KioskOrder = {
  id: string;
  memberCode: string;
  status: KioskOrderStatus;
  createdAt: string;
  workout: UserWorkoutInput;
  recommendation: NutritionRecommendation;
};
