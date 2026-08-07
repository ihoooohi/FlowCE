import { z } from "zod";
import { computeBmi } from "./health";

/**
 * Step payload validation.
 *
 * Every schema is `.strict()` (unknown keys rejected) and every number is
 * `.finite()` — so `NaN`/`Infinity`/numeric strings/extra fields are all
 * turned away at the boundary, before anything touches the database.
 */

export const STEP_KEYS = ["gender", "goal", "body", "activity"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export const LIMITS = {
  age: { min: 16, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  targetWeightKg: { min: 30, max: 300 },
  // Sanity window for current BMI: outside it, height/weight can't both be right.
  currentBmi: { min: 10, max: 80 },
  // Safety window for the *goal*: we refuse to plan toward BMI < 15 or > 60.
  targetBmi: { min: 15, max: 60 },
} as const;

const genderSchema = z
  .object({ gender: z.enum(["female", "male", "other"]) })
  .strict();

const goalSchema = z
  .object({ goal: z.enum(["lose_weight", "maintain", "gain_muscle"]) })
  .strict();

const roundTo1 = (v: number) => Math.round(v * 10) / 10;

const bodySchema = z
  .object({
    age: z
      .number({ invalid_type_error: "age must be a number" })
      .int("age must be an integer")
      .min(LIMITS.age.min, `age must be at least ${LIMITS.age.min}`)
      .max(LIMITS.age.max, `age must be at most ${LIMITS.age.max}`),
    heightCm: z
      .number({ invalid_type_error: "heightCm must be a number" })
      .finite()
      .min(LIMITS.heightCm.min, `heightCm must be at least ${LIMITS.heightCm.min}`)
      .max(LIMITS.heightCm.max, `heightCm must be at most ${LIMITS.heightCm.max}`)
      .transform(roundTo1),
    weightKg: z
      .number({ invalid_type_error: "weightKg must be a number" })
      .finite()
      .min(LIMITS.weightKg.min, `weightKg must be at least ${LIMITS.weightKg.min}`)
      .max(LIMITS.weightKg.max, `weightKg must be at most ${LIMITS.weightKg.max}`)
      .transform(roundTo1),
    targetWeightKg: z
      .number({ invalid_type_error: "targetWeightKg must be a number" })
      .finite()
      .min(
        LIMITS.targetWeightKg.min,
        `targetWeightKg must be at least ${LIMITS.targetWeightKg.min}`,
      )
      .max(
        LIMITS.targetWeightKg.max,
        `targetWeightKg must be at most ${LIMITS.targetWeightKg.max}`,
      )
      .transform(roundTo1),
  })
  .strict()
  .superRefine((body, ctx) => {
    const currentBmi = computeBmi(body.weightKg, body.heightCm);
    if (currentBmi < LIMITS.currentBmi.min || currentBmi > LIMITS.currentBmi.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightKg"],
        message: `height/weight combination is implausible (BMI ${currentBmi})`,
      });
    }
    const targetBmi = computeBmi(body.targetWeightKg, body.heightCm);
    if (targetBmi < LIMITS.targetBmi.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetWeightKg"],
        message: `target weight is unsafely low (target BMI ${targetBmi} < ${LIMITS.targetBmi.min})`,
      });
    }
    if (targetBmi > LIMITS.targetBmi.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetWeightKg"],
        message: `target weight is unsafely high (target BMI ${targetBmi} > ${LIMITS.targetBmi.max})`,
      });
    }
  });

const activitySchema = z
  .object({
    activityLevel: z.enum([
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active",
    ]),
  })
  .strict();

export const STEP_SCHEMAS = {
  gender: genderSchema,
  goal: goalSchema,
  body: bodySchema,
  activity: activitySchema,
} as const;

export type GenderAnswer = z.infer<typeof genderSchema>;
export type GoalAnswer = z.infer<typeof goalSchema>;
export type BodyAnswer = z.infer<typeof bodySchema>;
export type ActivityAnswer = z.infer<typeof activitySchema>;

export interface CompleteAnswers {
  gender: GenderAnswer;
  goal: GoalAnswer;
  body: BodyAnswer;
  activity: ActivityAnswer;
}

export function isStepKey(value: string): value is StepKey {
  return (STEP_KEYS as readonly string[]).includes(value);
}

export interface CrossFieldIssue {
  path: string;
  message: string;
}

/**
 * Rules that span steps, checked at submit time (steps may arrive in any
 * order, so per-step validation can't see them):
 * - lose_weight  → target strictly below current weight
 * - gain_muscle  → target at or above current weight
 * - maintain     → target equals current weight (±0.5 kg tolerance)
 */
export function validateCrossField(answers: CompleteAnswers): CrossFieldIssue[] {
  const issues: CrossFieldIssue[] = [];
  const { goal } = answers.goal;
  const { weightKg, targetWeightKg } = answers.body;
  const delta = targetWeightKg - weightKg;

  if (goal === "lose_weight" && delta >= 0) {
    issues.push({
      path: "body.targetWeightKg",
      message: "goal is lose_weight but target weight is not below current weight",
    });
  }
  if (goal === "gain_muscle" && delta < 0) {
    issues.push({
      path: "body.targetWeightKg",
      message: "goal is gain_muscle but target weight is below current weight",
    });
  }
  if (goal === "maintain" && Math.abs(delta) > 0.5) {
    issues.push({
      path: "body.targetWeightKg",
      message: "goal is maintain but target weight differs from current weight",
    });
  }
  return issues;
}
