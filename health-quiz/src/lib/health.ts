/**
 * Server-side health assessment algorithm.
 *
 * Pure and deterministic: the caller injects `now`, so the same input always
 * produces the same output — which is what makes the unit tests exact.
 *
 * Formulas:
 * - BMI      = weight(kg) / height(m)^2, WHO categories
 * - BMR      = Mifflin-St Jeor (gender "other" uses the male/female average)
 * - TDEE     = BMR × activity factor
 * - Pace     = 500 kcal/day deficit to lose, 300 kcal/day surplus to gain,
 *              converted to kg/week via 7700 kcal per kg of body mass
 * - Safety   = daily intake never drops below a per-gender floor; when the
 *              floor kicks in, the real (smaller) deficit drives the forecast
 */

export const ALGORITHM_VERSION = 1;

export type Gender = "female" | "male" | "other";
export type Goal = "lose_weight" | "maintain" | "gain_muscle";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type BmiCategoryValue = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESE";

export interface AssessmentInput {
  gender: Gender;
  goal: Goal;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
}

export interface ProjectionPoint {
  week: number;
  date: string; // ISO yyyy-mm-dd
  weightKg: number;
}

export interface AssessmentOutput {
  bmi: number;
  bmiCategory: BmiCategoryValue;
  bmr: number;
  tdee: number;
  recommendedCalories: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  weeklyChangeKg: number; // signed: negative = losing
  weeksToTarget: number;
  targetDate: string; // ISO yyyy-mm-dd
  projection: ProjectionPoint[];
  algorithmVersion: number;
}

const KCAL_PER_KG = 7700;
const LOSS_DEFICIT_KCAL = 500;
const GAIN_SURPLUS_KCAL = 300;
const MIN_CALORIES: Record<Gender, number> = {
  female: 1200,
  other: 1200,
  male: 1500,
};
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
// Beyond this the chart stops adding weekly points (targetDate stays exact).
const MAX_PROJECTION_POINTS = 104;

export class HealthAlgorithmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HealthAlgorithmError";
  }
}

function assertFinitePositive(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HealthAlgorithmError(`${name} must be a finite positive number`);
  }
}

export function computeBmi(weightKg: number, heightCm: number): number {
  assertFinitePositive(weightKg, "weightKg");
  assertFinitePositive(heightCm, "heightCm");
  const heightM = heightCm / 100;
  return round1(weightKg / (heightM * heightM));
}

export function classifyBmi(bmi: number): BmiCategoryValue {
  assertFinitePositive(bmi, "bmi");
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 25) return "NORMAL";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESE";
}

export function computeBmr(
  gender: Gender,
  age: number,
  heightCm: number,
  weightKg: number,
): number {
  assertFinitePositive(age, "age");
  assertFinitePositive(heightCm, "heightCm");
  assertFinitePositive(weightKg, "weightKg");
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const offset = { male: 5, female: -161, other: -78 }[gender];
  if (offset === undefined) {
    throw new HealthAlgorithmError(`unknown gender: ${String(gender)}`);
  }
  return Math.round(base + offset);
}

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  assertFinitePositive(bmr, "bmr");
  const factor = ACTIVITY_FACTOR[activityLevel];
  if (factor === undefined) {
    throw new HealthAlgorithmError(
      `unknown activity level: ${String(activityLevel)}`,
    );
  }
  return Math.round(bmr * factor);
}

export function computeAssessment(
  input: AssessmentInput,
  now: Date,
): AssessmentOutput {
  const { gender, goal, age, heightCm, weightKg, targetWeightKg } = input;
  assertFinitePositive(targetWeightKg, "targetWeightKg");
  if (Number.isNaN(now.getTime())) {
    throw new HealthAlgorithmError("now must be a valid date");
  }

  const bmi = computeBmi(weightKg, heightCm);
  const bmiCategory = classifyBmi(bmi);
  const bmr = computeBmr(gender, age, heightCm, weightKg);
  const tdee = computeTdee(bmr, input.activityLevel);

  const deltaKg = round1(targetWeightKg - weightKg);
  const direction = goal === "maintain" || deltaKg === 0 ? 0 : Math.sign(deltaKg);

  let recommendedCalories: number;
  if (direction < 0) {
    recommendedCalories = Math.max(tdee - LOSS_DEFICIT_KCAL, MIN_CALORIES[gender]);
  } else if (direction > 0) {
    recommendedCalories = tdee + GAIN_SURPLUS_KCAL;
  } else {
    recommendedCalories = tdee;
  }

  // The effective surplus/deficit (which the calorie floor may have shrunk)
  // is what honestly drives the pace — not the nominal 500/300.
  const dailyDeltaKcal = recommendedCalories - tdee;
  const weeklyChangeKg = round2((dailyDeltaKcal * 7) / KCAL_PER_KG);

  let daysToTarget = 0;
  if (direction !== 0) {
    if (weeklyChangeKg === 0 || Math.sign(weeklyChangeKg) !== direction) {
      // Only reachable if the calorie floor swallowed the whole deficit
      // (e.g. TDEE at or below the floor) — the target is not attainable
      // at a safe intake, and we refuse to fabricate a date.
      throw new HealthAlgorithmError(
        "target weight is not reachable at a safe calorie intake",
      );
    }
    daysToTarget = Math.ceil(Math.abs(deltaKg) / (Math.abs(weeklyChangeKg) / 7));
  }
  const weeksToTarget = Math.ceil(daysToTarget / 7);
  const targetDate = isoDate(addDays(now, daysToTarget));

  const projection: ProjectionPoint[] = [];
  const chartWeeks = Math.min(weeksToTarget, MAX_PROJECTION_POINTS);
  for (let week = 0; week <= chartWeeks; week++) {
    const travelled = Math.min(Math.abs(weeklyChangeKg) * week, Math.abs(deltaKg));
    projection.push({
      week,
      date: isoDate(addDays(now, week * 7)),
      weightKg: round1(weightKg + direction * travelled),
    });
  }
  // Pin the exact target as the final point when it lands mid-week.
  const last = projection[projection.length - 1];
  if (last && weeksToTarget <= MAX_PROJECTION_POINTS && last.weightKg !== targetWeightKg && direction !== 0) {
    projection.push({
      week: weeksToTarget,
      date: targetDate,
      weightKg: round1(targetWeightKg),
    });
  }

  const macros = computeMacros(recommendedCalories);

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    recommendedCalories,
    macros,
    weeklyChangeKg: direction === 0 ? 0 : weeklyChangeKg,
    weeksToTarget,
    targetDate,
    projection,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

/** 30% protein / 40% carbs / 30% fat (4 / 4 / 9 kcal per gram). */
export function computeMacros(calories: number): {
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  assertFinitePositive(calories, "calories");
  return {
    proteinG: Math.round((calories * 0.3) / 4),
    carbsG: Math.round((calories * 0.4) / 4),
    fatG: Math.round((calories * 0.3) / 9),
  };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
