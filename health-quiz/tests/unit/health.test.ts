import { describe, expect, it } from "vitest";
import {
  classifyBmi,
  computeAssessment,
  computeBmi,
  computeBmr,
  computeMacros,
  computeTdee,
  HealthAlgorithmError,
  type AssessmentInput,
} from "@/lib/health";

const NOW = new Date("2026-01-01T00:00:00Z");

const baseInput: AssessmentInput = {
  gender: "female",
  goal: "lose_weight",
  age: 29,
  heightCm: 165,
  weightKg: 68,
  targetWeightKg: 58,
  activityLevel: "light",
};

describe("computeBmi", () => {
  it("computes the textbook formula, rounded to 1 decimal", () => {
    expect(computeBmi(70, 175)).toBe(22.9); // 70 / 1.75² = 22.857
    expect(computeBmi(68, 165)).toBe(25.0);
    expect(computeBmi(45, 180)).toBe(13.9);
  });

  it.each([
    [0, 170],
    [-5, 170],
    [NaN, 170],
    [Infinity, 170],
    [70, 0],
    [70, -170],
    [70, NaN],
  ])("rejects non-positive / non-finite input (%s kg, %s cm)", (w, h) => {
    expect(() => computeBmi(w, h)).toThrow(HealthAlgorithmError);
  });
});

describe("classifyBmi — WHO category boundaries", () => {
  it.each([
    [10, "UNDERWEIGHT"],
    [18.4, "UNDERWEIGHT"],
    [18.5, "NORMAL"], // boundary belongs to the upper class
    [24.9, "NORMAL"],
    [25.0, "OVERWEIGHT"],
    [29.9, "OVERWEIGHT"],
    [30.0, "OBESE"],
    [60, "OBESE"],
  ] as const)("BMI %s → %s", (bmi, category) => {
    expect(classifyBmi(bmi)).toBe(category);
  });
});

describe("computeBmr — Mifflin-St Jeor", () => {
  // base = 10·70 + 6.25·175 − 5·30 = 1643.75
  it("applies the per-gender offset", () => {
    expect(computeBmr("male", 30, 175, 70)).toBe(1649); // +5
    expect(computeBmr("female", 30, 175, 70)).toBe(1483); // −161
    expect(computeBmr("other", 30, 175, 70)).toBe(1566); // −78 (average)
  });

  it("rejects non-positive age/height/weight", () => {
    expect(() => computeBmr("male", 0, 175, 70)).toThrow(HealthAlgorithmError);
    expect(() => computeBmr("male", 30, 175, -70)).toThrow(HealthAlgorithmError);
    expect(() => computeBmr("male", NaN, 175, 70)).toThrow(HealthAlgorithmError);
  });
});

describe("computeTdee — activity multipliers", () => {
  it.each([
    ["sedentary", 1200],
    ["light", 1375],
    ["moderate", 1550],
    ["active", 1725],
    ["very_active", 1900],
  ] as const)("%s → 1000 kcal BMR becomes %s", (level, expected) => {
    expect(computeTdee(1000, level)).toBe(expected);
  });
});

describe("computeMacros", () => {
  it("30/40/30 split whose kcal roughly re-add to the input", () => {
    const m = computeMacros(2000);
    expect(m).toEqual({ proteinG: 150, carbsG: 200, fatG: 67 });
    const kcal = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9;
    expect(Math.abs(kcal - 2000)).toBeLessThanOrEqual(10);
  });
});

describe("computeAssessment — weight loss", () => {
  const out = computeAssessment(baseInput, NOW);

  it("derives BMI / BMR / TDEE / calories consistently", () => {
    // BMR: 10·68 + 6.25·165 − 5·29 − 161 = 1405.25 → 1405
    expect(out.bmr).toBe(1405);
    expect(out.tdee).toBe(1932); // 1405 × 1.375 = 1931.875
    expect(out.recommendedCalories).toBe(1432); // TDEE − 500
    expect(out.bmi).toBe(25.0);
    expect(out.bmiCategory).toBe("OVERWEIGHT");
  });

  it("converts the 500 kcal/day deficit into pace and an exact date", () => {
    expect(out.weeklyChangeKg).toBe(-0.45); // 500·7/7700 = 0.4545
    // 10 kg at 0.45 kg/week → ceil(10 / (0.45/7)) = 156 days
    const expected = new Date(NOW.getTime() + 156 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(out.targetDate).toBe(expected);
    expect(out.weeksToTarget).toBe(Math.ceil(156 / 7));
  });

  it("projection starts at current weight and ends exactly at target", () => {
    expect(out.projection[0]).toMatchObject({ week: 0, weightKg: 68 });
    const last = out.projection[out.projection.length - 1]!;
    expect(last.weightKg).toBe(58);
    // strictly non-increasing on the way down
    for (let i = 1; i < out.projection.length; i++) {
      expect(out.projection[i]!.weightKg).toBeLessThanOrEqual(
        out.projection[i - 1]!.weightKg,
      );
    }
  });

  it("is deterministic for a fixed clock", () => {
    expect(computeAssessment(baseInput, NOW)).toEqual(out);
  });
});

describe("computeAssessment — calorie floor safety", () => {
  it("clamps intake at the floor and slows the forecast honestly", () => {
    // female 40y 160cm 55kg light: BMR 1189, TDEE 1635 → 1635−500 < 1200 floor
    const out = computeAssessment(
      {
        gender: "female",
        goal: "lose_weight",
        age: 40,
        heightCm: 160,
        weightKg: 55,
        targetWeightKg: 50,
        activityLevel: "light",
      },
      NOW,
    );
    expect(out.recommendedCalories).toBe(1200);
    expect(out.weeklyChangeKg).toBe(-0.4); // (1635−1200)·7/7700 = 0.3955
  });

  it("refuses to fabricate a date when the floor eats the whole deficit", () => {
    // female 60y 150cm 45kg sedentary: TDEE ≈ 1112 < 1200 floor → no deficit possible
    expect(() =>
      computeAssessment(
        {
          gender: "female",
          goal: "lose_weight",
          age: 60,
          heightCm: 150,
          weightKg: 45,
          targetWeightKg: 42,
          activityLevel: "sedentary",
        },
        NOW,
      ),
    ).toThrow(HealthAlgorithmError);
  });
});

describe("computeAssessment — gain and maintain", () => {
  it("gain: +300 kcal surplus, positive pace", () => {
    const out = computeAssessment(
      { ...baseInput, gender: "male", goal: "gain_muscle", weightKg: 60, targetWeightKg: 66 },
      NOW,
    );
    expect(out.recommendedCalories).toBe(out.tdee + 300);
    expect(out.weeklyChangeKg).toBe(0.27); // 300·7/7700 = 0.2727
    expect(out.projection[out.projection.length - 1]!.weightKg).toBe(66);
  });

  it("maintain: zero pace, target date is today, single-point projection", () => {
    const out = computeAssessment(
      { ...baseInput, goal: "maintain", targetWeightKg: 68 },
      NOW,
    );
    expect(out.weeklyChangeKg).toBe(0);
    expect(out.recommendedCalories).toBe(out.tdee);
    expect(out.targetDate).toBe("2026-01-01");
    expect(out.projection).toEqual([{ week: 0, date: "2026-01-01", weightKg: 68 }]);
  });

  it("maintain wins even when target differs (goal drives direction)", () => {
    const out = computeAssessment(
      { ...baseInput, goal: "maintain", targetWeightKg: 60 },
      NOW,
    );
    expect(out.weeklyChangeKg).toBe(0);
    expect(out.weeksToTarget).toBe(0);
  });
});

describe("computeAssessment — extreme spans", () => {
  it("caps the projection chart but keeps the exact target date", () => {
    // 85 kg to lose at ~0.45 kg/week ≈ 189 weeks > 104-point chart cap
    const out = computeAssessment(
      {
        gender: "male",
        goal: "lose_weight",
        age: 35,
        heightCm: 180,
        weightKg: 160,
        targetWeightKg: 75,
        activityLevel: "moderate",
      },
      NOW,
    );
    expect(out.weeksToTarget).toBeGreaterThan(104);
    expect(out.projection.length).toBe(105); // weeks 0..104
    expect(out.targetDate > "2029-01-01").toBe(true);
  });

  it("rejects an invalid clock", () => {
    expect(() => computeAssessment(baseInput, new Date("nonsense"))).toThrow(
      HealthAlgorithmError,
    );
  });
});
