"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  clearSessionId,
  getStoredSessionId,
  storeSessionId,
} from "@/lib/client";

type StepKey = "gender" | "goal" | "body" | "activity";
const STEPS: StepKey[] = ["gender", "goal", "body", "activity"];

interface ProgressData {
  sessionId: string;
  status: string;
  completedSteps: StepKey[];
  nextStep: StepKey | null;
  answers: Partial<Record<StepKey, Record<string, unknown>>>;
}

interface ApiIssue {
  path: string;
  message: string;
}

const GENDER_OPTIONS = [
  { value: "female", label: "女性", emoji: "👩" },
  { value: "male", label: "男性", emoji: "👨" },
  { value: "other", label: "其他 / 不愿透露", emoji: "🌈" },
];

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "减轻体重", sub: "科学减脂,循序渐进", emoji: "🔥" },
  { value: "maintain", label: "保持体重", sub: "巩固现状,吃得更聪明", emoji: "⚖️" },
  { value: "gain_muscle", label: "增肌增重", sub: "热量盈余,配合训练", emoji: "💪" },
];

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "几乎不动", sub: "久坐办公,很少运动", emoji: "🪑" },
  { value: "light", label: "轻度活动", sub: "每周运动 1–2 次", emoji: "🚶" },
  { value: "moderate", label: "中度活动", sub: "每周运动 3–5 次", emoji: "🏃" },
  { value: "active", label: "高度活动", sub: "几乎每天运动", emoji: "🚴" },
  { value: "very_active", label: "极高强度", sub: "体力工作或每日高强度训练", emoji: "🏋️" },
];

const FIELD_LABELS: Record<string, string> = {
  age: "年龄",
  heightCm: "身高",
  weightKg: "当前体重",
  targetWeightKg: "目标体重",
};

export default function QuizPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [gender, setGender] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [body, setBody] = useState({
    age: "",
    heightCm: "",
    weightKg: "",
    targetWeightKg: "",
  });

  const applyProgress = useCallback((progress: ProgressData) => {
    const a = progress.answers;
    if (a.gender) setGender(a.gender.gender as string);
    if (a.goal) setGoal(a.goal.goal as string);
    if (a.activity) setActivity(a.activity.activityLevel as string);
    if (a.body) {
      setBody({
        age: String(a.body.age ?? ""),
        heightCm: String(a.body.heightCm ?? ""),
        weightKg: String(a.body.weightKg ?? ""),
        targetWeightKg: String(a.body.targetWeightKg ?? ""),
      });
    }
    if (progress.completedSteps.length > 0) setResumed(true);
    const next = progress.nextStep ?? "activity";
    setStepIndex(STEPS.indexOf(next));
  }, []);

  // Boot: resume the stored session if the server still knows it,
  // otherwise mint a fresh one.
  useEffect(() => {
    (async () => {
      const stored = getStoredSessionId();
      if (stored) {
        const res = await api<ProgressData>(`/sessions/${stored}`);
        if (res.status === 200 && res.body.data) {
          if (res.body.data.status === "SUBMITTED") {
            router.replace("/results");
            return;
          }
          setSessionId(stored);
          applyProgress(res.body.data);
          setLoading(false);
          return;
        }
      }
      const created = await api<{ sessionId: string }>("/sessions", {
        method: "POST",
      });
      if (created.body.data) {
        storeSessionId(created.body.data.sessionId);
        setSessionId(created.body.data.sessionId);
      }
      setLoading(false);
    })().catch(() => {
      setFormError("网络异常,请刷新重试");
      setLoading(false);
    });
  }, [router, applyProgress]);

  const currentStep = STEPS[stepIndex] ?? "gender";

  const saveStep = useCallback(
    async (stepKey: StepKey, payload: Record<string, unknown>): Promise<boolean> => {
      if (!sessionId) return false;
      setSaving(true);
      setFormError(null);
      setFieldErrors({});
      try {
        const res = await api(`/sessions/${sessionId}/answers/${stepKey}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (res.status === 200) return true;
        if (res.status === 422 && res.body.error?.details) {
          const issues = (res.body.error.details as { issues?: ApiIssue[] }).issues ?? [];
          const byField: Record<string, string> = {};
          for (const issue of issues) byField[issue.path] = issue.message;
          setFieldErrors(byField);
          setFormError("请检查标红的输入项");
        } else {
          setFormError(res.body.error?.message ?? "保存失败,请重试");
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sessionId],
  );

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const handleChoice = async (stepKey: StepKey, payload: Record<string, unknown>) => {
    if (await saveStep(stepKey, payload)) {
      if (stepIndex < STEPS.length - 1) goNext();
      else await handleSubmit();
    }
  };

  const parseBodyForm = (): Record<string, number> | null => {
    const errors: Record<string, string> = {};
    const values: Record<string, number> = {};
    for (const [key, raw] of Object.entries(body)) {
      const trimmed = raw.trim();
      const num = trimmed === "" ? NaN : Number(trimmed);
      if (!Number.isFinite(num)) {
        errors[key] = `请填写${FIELD_LABELS[key] ?? key}`;
      } else {
        values[key] = num;
      }
    }
    if (goal === "maintain") values.targetWeightKg = values.weightKg ?? NaN;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("请检查标红的输入项");
      return null;
    }
    return values;
  };

  const handleBodyNext = async () => {
    const values = parseBodyForm();
    if (!values) return;
    if (await saveStep("body", values)) goNext();
  };

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api<{ status: string }>(`/sessions/${sessionId}/submit`, {
        method: "POST",
      });
      if (res.status === 201 || res.status === 200) {
        router.push("/results");
        return;
      }
      const details = res.body.error?.details as
        | { issues?: ApiIssue[]; missingSteps?: string[] }
        | undefined;
      if (details?.missingSteps) {
        setFormError("还有未完成的步骤,已带你回到该步骤");
        setStepIndex(STEPS.indexOf(details.missingSteps[0] as StepKey));
      } else if (details?.issues?.length) {
        setFormError(`目标设置有矛盾:${details.issues[0]!.message}`);
        setStepIndex(STEPS.indexOf("body"));
      } else {
        setFormError(res.body.error?.message ?? "提交失败,请重试");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const restart = async () => {
    clearSessionId();
    setGender(null);
    setGoal(null);
    setActivity(null);
    setBody({ age: "", heightCm: "", weightKg: "", targetWeightKg: "" });
    setResumed(false);
    setStepIndex(0);
    setLoading(true);
    const created = await api<{ sessionId: string }>("/sessions", { method: "POST" });
    if (created.body.data) {
      storeSessionId(created.body.data.sessionId);
      setSessionId(created.body.data.sessionId);
    }
    setLoading(false);
  };

  const progressPct = useMemo(
    () => Math.round(((stepIndex + 1) / STEPS.length) * 100),
    [stepIndex],
  );

  if (loading) {
    return (
      <main className="shell">
        <div className="loading">
          <span className="spin" />
          <p>正在准备你的测评…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        轻盈计划
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="progress-label">
        第 {stepIndex + 1} 步,共 {STEPS.length} 步
        {resumed && " · 已为你恢复上次的进度"}
      </div>

      {formError && <div className="form-error">{formError}</div>}

      {currentStep === "gender" && (
        <section>
          <h2 className="step-title">你的性别是?</h2>
          <p className="step-sub">用于选择对应的基础代谢率(BMR)计算公式。</p>
          <div className="option-grid">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${gender === opt.value ? "selected" : ""}`}
                disabled={saving}
                onClick={() => {
                  setGender(opt.value);
                  void handleChoice("gender", { gender: opt.value });
                }}
              >
                <span className="emoji">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {currentStep === "goal" && (
        <section>
          <h2 className="step-title">你的目标是?</h2>
          <p className="step-sub">我们据此决定热量缺口方向与推进节奏。</p>
          <div className="option-grid">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${goal === opt.value ? "selected" : ""}`}
                disabled={saving}
                onClick={() => {
                  setGoal(opt.value);
                  void handleChoice("goal", { goal: opt.value });
                }}
              >
                <span className="emoji">{opt.emoji}</span>
                <span>
                  {opt.label}
                  <small>{opt.sub}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {currentStep === "body" && (
        <section>
          <h2 className="step-title">你的身体数据</h2>
          <p className="step-sub">仅用于计算,匿名存储,不与任何身份信息关联。</p>

          {(
            [
              { key: "age", label: "年龄", unit: "岁", hint: "16 – 100" },
              { key: "heightCm", label: "身高", unit: "cm", hint: "120 – 230" },
              { key: "weightKg", label: "当前体重", unit: "kg", hint: "30 – 300" },
            ] as const
          ).map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <div className="unit-input">
                <input
                  inputMode="decimal"
                  placeholder={f.hint}
                  value={body[f.key]}
                  onChange={(e) => setBody((b) => ({ ...b, [f.key]: e.target.value }))}
                />
                <span className="unit">{f.unit}</span>
              </div>
              {fieldErrors[f.key] && <div className="error">{fieldErrors[f.key]}</div>}
            </div>
          ))}

          {goal !== "maintain" && (
            <div className="field">
              <label>目标体重</label>
              <div className="unit-input">
                <input
                  inputMode="decimal"
                  placeholder={goal === "gain_muscle" ? "高于当前体重" : "低于当前体重"}
                  value={body.targetWeightKg}
                  onChange={(e) =>
                    setBody((b) => ({ ...b, targetWeightKg: e.target.value }))
                  }
                />
                <span className="unit">kg</span>
              </div>
              {fieldErrors.targetWeightKg && (
                <div className="error">{fieldErrors.targetWeightKg}</div>
              )}
            </div>
          )}

          <div className="wizard-actions">
            <button className="btn btn-primary" onClick={handleBodyNext} disabled={saving}>
              {saving ? "保存中…" : "继续 →"}
            </button>
          </div>
        </section>
      )}

      {currentStep === "activity" && (
        <section>
          <h2 className="step-title">平时的运动频率?</h2>
          <p className="step-sub">决定你的每日总消耗(TDEE)系数。</p>
          <div className="option-grid">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`option-card ${activity === opt.value ? "selected" : ""}`}
                disabled={saving || submitting}
                onClick={() => {
                  setActivity(opt.value);
                  void handleChoice("activity", { activityLevel: opt.value });
                }}
              >
                <span className="emoji">{opt.emoji}</span>
                <span>
                  {opt.label}
                  <small>{opt.sub}</small>
                </span>
              </button>
            ))}
          </div>
          {submitting && <p className="footnote">正在生成你的专属计划…</p>}
        </section>
      )}

      <div className="trust-note">🔒 数据实时保存 · 关闭页面随时回来继续</div>
      <button className="btn btn-ghost" onClick={restart}>
        重新开始测评
      </button>
    </main>
  );
}
