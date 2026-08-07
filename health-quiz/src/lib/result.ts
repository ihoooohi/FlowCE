import type { Assessment } from "@prisma/client";
import type { CompleteAnswers } from "./quiz-schema";
import type { ProjectionPoint } from "./health";

/**
 * Result serialization — the single place that decides what each tier sees.
 *
 * Free tier gets the hook (BMI + category + coarse ETA month); everything a
 * subscriber pays for is OMITTED from the payload entirely (not nulled, not
 * zeroed) so there is nothing to scrape. Tests assert key absence.
 */

export const PREMIUM_ONLY_FIELDS = [
  "bmr",
  "tdee",
  "recommendedCalories",
  "macros",
  "weeklyChangeKg",
  "targetDate",
  "weeksToTarget",
  "projection",
] as const;

interface ProfileView {
  gender: string;
  goal: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: string;
}

export interface FreeResultView {
  sessionId: string;
  tier: "free";
  profile: ProfileView;
  summary: { bmi: number; bmiCategory: string };
  preview: { targetMonth: string; headline: string };
  locked: readonly string[];
  upgrade: {
    required: true;
    message: string;
    payEndpoint: string;
    plans: { plan: string; amountCents: number; currency: string }[];
  };
}

export interface PremiumResultView {
  sessionId: string;
  tier: "premium";
  profile: ProfileView;
  summary: { bmi: number; bmiCategory: string };
  plan: {
    bmr: number;
    tdee: number;
    recommendedCalories: number;
    macros: { proteinG: number; carbsG: number; fatG: number };
    weeklyChangeKg: number;
    targetDate: string;
    weeksToTarget: number;
    projection: ProjectionPoint[];
  };
}

export const PLAN_PRICING = [
  { plan: "MONTHLY", amountCents: 6800, currency: "CNY" },
  { plan: "YEARLY", amountCents: 39800, currency: "CNY" },
] as const;

function toProfile(answers: CompleteAnswers): ProfileView {
  return {
    gender: answers.gender.gender,
    goal: answers.goal.goal,
    age: answers.body.age,
    heightCm: answers.body.heightCm,
    weightKg: answers.body.weightKg,
    targetWeightKg: answers.body.targetWeightKg,
    activityLevel: answers.activity.activityLevel,
  };
}

export function serializeResult(
  sessionId: string,
  answers: CompleteAnswers,
  assessment: Assessment,
  premium: boolean,
): FreeResultView | PremiumResultView {
  const summary = {
    bmi: Number(assessment.bmi),
    bmiCategory: assessment.bmiCategory,
  };
  const profile = toProfile(answers);
  const targetDate = assessment.targetDate.toISOString().slice(0, 10);

  if (!premium) {
    return {
      sessionId,
      tier: "free",
      profile,
      summary,
      preview: {
        targetMonth: targetDate.slice(0, 7),
        headline: "你的专属计划已生成",
      },
      locked: PREMIUM_ONLY_FIELDS,
      upgrade: {
        required: true,
        message: "订阅后解锁完整计划:每日热量与三大营养素配比、达成日期与逐周体重预测曲线",
        payEndpoint: "/api/v1/pay",
        plans: PLAN_PRICING.map((p) => ({ ...p })),
      },
    };
  }

  const projection = assessment.projection as unknown as ProjectionPoint[];
  const lastPoint = projection[projection.length - 1];
  return {
    sessionId,
    tier: "premium",
    profile,
    summary,
    plan: {
      bmr: assessment.bmr,
      tdee: assessment.tdee,
      recommendedCalories: assessment.recommendedCalories,
      macros: {
        proteinG: assessment.proteinG,
        carbsG: assessment.carbsG,
        fatG: assessment.fatG,
      },
      weeklyChangeKg: Number(assessment.weeklyChangeKg),
      targetDate,
      weeksToTarget: lastPoint ? lastPoint.week : 0,
      projection,
    },
  };
}
