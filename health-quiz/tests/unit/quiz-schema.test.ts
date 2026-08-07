import { describe, expect, it } from "vitest";
import {
  LIMITS,
  STEP_SCHEMAS,
  validateCrossField,
  type CompleteAnswers,
} from "@/lib/quiz-schema";

const validBody = { age: 29, heightCm: 165, weightKg: 68, targetWeightKg: 58 };

describe("gender / goal / activity — closed enums", () => {
  it("accepts each declared value", () => {
    expect(STEP_SCHEMAS.gender.parse({ gender: "female" })).toEqual({ gender: "female" });
    expect(STEP_SCHEMAS.goal.parse({ goal: "gain_muscle" })).toEqual({ goal: "gain_muscle" });
    expect(STEP_SCHEMAS.activity.parse({ activityLevel: "very_active" })).toEqual({
      activityLevel: "very_active",
    });
  });

  it.each([
    [STEP_SCHEMAS.gender, { gender: "dragon" }],
    [STEP_SCHEMAS.gender, { gender: 1 }],
    [STEP_SCHEMAS.gender, {}],
    [STEP_SCHEMAS.goal, { goal: "get_rich" }],
    [STEP_SCHEMAS.activity, { activityLevel: "couch" }],
  ])("rejects values outside the enum", (schema, payload) => {
    expect(schema.safeParse(payload).success).toBe(false);
  });

  it("rejects extra keys (strict objects)", () => {
    expect(
      STEP_SCHEMAS.gender.safeParse({ gender: "male", admin: true }).success,
    ).toBe(false);
  });
});

describe("body step — numeric boundaries", () => {
  it("accepts the exact limits", () => {
    expect(
      STEP_SCHEMAS.body.safeParse({
        age: LIMITS.age.min,
        heightCm: 170,
        weightKg: 70,
        targetWeightKg: 65,
      }).success,
    ).toBe(true);
    expect(
      STEP_SCHEMAS.body.safeParse({
        age: LIMITS.age.max,
        heightCm: 170,
        weightKg: 70,
        targetWeightKg: 65,
      }).success,
    ).toBe(true);
  });

  it("normalizes measurements to 1 decimal", () => {
    const parsed = STEP_SCHEMAS.body.parse({
      age: 29,
      heightCm: 165.44,
      weightKg: 68.456,
      targetWeightKg: 58.04,
    });
    expect(parsed.heightCm).toBe(165.4);
    expect(parsed.weightKg).toBe(68.5);
    expect(parsed.targetWeightKg).toBe(58);
  });

  it.each([
    ["age below minimum", { ...validBody, age: 15 }],
    ["age above maximum", { ...validBody, age: 101 }],
    ["age not an integer", { ...validBody, age: 29.5 }],
    ["age as numeric string", { ...validBody, age: "29" }],
    ["age NaN", { ...validBody, age: NaN }],
    ["height below 120", { ...validBody, heightCm: 119.9 }],
    ["height above 230", { ...validBody, heightCm: 230.1 }],
    ["height Infinity", { ...validBody, heightCm: Infinity }],
    ["height negative", { ...validBody, heightCm: -165 }],
    ["weight below 30", { ...validBody, weightKg: 29.9 }],
    ["weight above 300", { ...validBody, weightKg: 300.1 }],
    ["weight null", { ...validBody, weightKg: null }],
    ["weight boolean", { ...validBody, weightKg: true }],
    ["weight SQL-ish string", { ...validBody, weightKg: "68; DROP TABLE users;--" }],
    ["target weight missing", { age: 29, heightCm: 165, weightKg: 68 }],
    ["extra field", { ...validBody, isAdmin: true }],
    ["array payload", [1, 2, 3]],
    ["string payload", "hello"],
    ["null payload", null],
  ])("rejects %s", (_label, payload) => {
    expect(STEP_SCHEMAS.body.safeParse(payload).success).toBe(false);
  });

  it("rejects implausible height/weight combinations (current BMI sanity)", () => {
    // 30 kg at 230 cm → BMI 5.7: both numbers are in range, together impossible
    expect(
      STEP_SCHEMAS.body.safeParse({
        age: 30,
        heightCm: 230,
        weightKg: 30,
        targetWeightKg: 70,
      }).success,
    ).toBe(false);
  });

  it("rejects unsafely low and high target weights (target BMI window)", () => {
    // 45 kg at 180 cm → target BMI 13.9 < 15
    const low = STEP_SCHEMAS.body.safeParse({
      age: 30,
      heightCm: 180,
      weightKg: 80,
      targetWeightKg: 45,
    });
    expect(low.success).toBe(false);
    // 200 kg at 150 cm → target BMI 88.9 > 60
    const high = STEP_SCHEMAS.body.safeParse({
      age: 30,
      heightCm: 150,
      weightKg: 100,
      targetWeightKg: 200,
    });
    expect(high.success).toBe(false);
  });
});

describe("validateCrossField — goal vs target consistency", () => {
  const answers = (
    goal: "lose_weight" | "maintain" | "gain_muscle",
    weightKg: number,
    targetWeightKg: number,
  ): CompleteAnswers => ({
    gender: { gender: "female" },
    goal: { goal },
    body: { age: 29, heightCm: 165, weightKg, targetWeightKg },
    activity: { activityLevel: "light" },
  });

  it("passes consistent combinations", () => {
    expect(validateCrossField(answers("lose_weight", 68, 58))).toEqual([]);
    expect(validateCrossField(answers("gain_muscle", 60, 66))).toEqual([]);
    expect(validateCrossField(answers("gain_muscle", 60, 60))).toEqual([]);
    expect(validateCrossField(answers("maintain", 68, 68))).toEqual([]);
    expect(validateCrossField(answers("maintain", 68, 68.4))).toEqual([]); // ±0.5 tolerance
  });

  it.each([
    ["lose_weight with target above current", "lose_weight", 68, 75],
    ["lose_weight with target equal to current", "lose_weight", 68, 68],
    ["gain_muscle with target below current", "gain_muscle", 68, 60],
    ["maintain with target far from current", "maintain", 68, 60],
  ] as const)("flags %s", (_label, goal, w, t) => {
    const issues = validateCrossField(answers(goal, w, t));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.path).toBe("body.targetWeightKg");
  });
});
