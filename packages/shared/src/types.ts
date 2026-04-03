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
  weightKg: number | null;
  gymName: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  workout: UserWorkoutInput;
  recommendation: NutritionRecommendation;
  preparationStatus: PreparationStatus;
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
