"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredSessionId } from "@/lib/client";

interface Profile {
  gender: string;
  goal: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: string;
}

interface ProjectionPoint {
  week: number;
  date: string;
  weightKg: number;
}

interface FreeView {
  tier: "free";
  profile: Profile;
  summary: { bmi: number; bmiCategory: string };
  preview: { targetMonth: string; headline: string };
  upgrade: {
    message: string;
    plans: { plan: string; amountCents: number; currency: string }[];
  };
}

interface PremiumView {
  tier: "premium";
  profile: Profile;
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

type ResultView = FreeView | PremiumView;

const CATEGORY_LABELS: Record<string, string> = {
  UNDERWEIGHT: "偏瘦",
  NORMAL: "标准",
  OVERWEIGHT: "偏重",
  OBESE: "肥胖",
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "减重",
  maintain: "保持",
  gain_muscle: "增肌",
};

function ProjectionChart({ points }: { points: ProjectionPoint[] }) {
  if (points.length < 2) return null;
  const W = 480;
  const H = 180;
  const PAD = 10;
  const weights = points.map((p) => p.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (w: number) => PAD + ((max - w) / span) * (H - PAD * 2);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`).join(" ");
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="体重预测曲线">
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e6b4e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1e6b4e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#fill)" />
        <polyline points={line} fill="none" stroke="#1e6b4e" strokeWidth="3" strokeLinecap="round" />
        <circle cx={x(0)} cy={y(first.weightKg)} r="5" fill="#1e6b4e" />
        <circle cx={x(points.length - 1)} cy={y(last.weightKg)} r="6" fill="#f2a03d" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="chart-meta">
        <span>
          现在 · {first.weightKg} kg
        </span>
        <span>
          {last.date} · {last.weightKg} kg
        </span>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [view, setView] = useState<ResultView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [paying, setPaying] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);

  const sessionId = typeof window !== "undefined" ? getStoredSessionId() : null;

  const fetchResult = useCallback(async () => {
    if (!sessionId) {
      router.replace("/quiz");
      return;
    }
    const res = await api<ResultView>(`/sessions/${sessionId}/result`);
    if (res.status === 200 && res.body.data) {
      setView(res.body.data);
    } else if (res.status === 409 || res.status === 404) {
      router.replace("/quiz");
      return;
    } else {
      setError(res.body.error?.message ?? "加载失败,请刷新重试");
    }
    setLoading(false);
  }, [sessionId, router]);

  useEffect(() => {
    void fetchResult();
  }, [fetchResult]);

  const handlePay = async () => {
    if (!sessionId) return;
    setPaying(true);
    setError(null);
    try {
      // Demo checkout: this endpoint stands in for the payment provider's
      // server-to-server callback after a successful charge.
      const res = await api(`/pay`, {
        method: "POST",
        body: JSON.stringify({ sessionId, plan }),
      });
      if (res.status === 200 || res.status === 201) {
        setJustUnlocked(true);
        await fetchResult();
      } else {
        setError(res.body.error?.message ?? "支付失败,请重试");
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading || !view) {
    return (
      <main className="shell">
        <div className="loading">
          <span className="spin" />
          <p>{error ?? "正在生成你的报告…"}</p>
        </div>
      </main>
    );
  }

  const { summary, profile } = view;
  const deltaKg = Math.abs(profile.targetWeightKg - profile.weightKg);

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        轻盈计划
      </div>

      <h2 className="step-title">你的健康评估报告</h2>
      <p className="step-sub">
        {GOAL_LABELS[profile.goal] ?? profile.goal}目标 ·{" "}
        {profile.goal === "maintain"
          ? "保持当前体重"
          : `${profile.weightKg} kg → ${profile.targetWeightKg} kg`}
      </p>

      {error && <div className="form-error">{error}</div>}
      {justUnlocked && view.tier === "premium" && (
        <div className="card" style={{ borderColor: "#1e6b4e" }}>
          🎉 已解锁完整计划,欢迎加入轻盈会员!
        </div>
      )}

      <div className="card">
        <h3>身体质量指数 BMI</h3>
        <div className="metric-row">
          <div className="metric">
            <b>{summary.bmi}</b>
            <span>BMI</span>
          </div>
          <div className="metric">
            <b>
              <span className={`bmi-pill bmi-${summary.bmiCategory}`}>
                {CATEGORY_LABELS[summary.bmiCategory] ?? summary.bmiCategory}
              </span>
            </b>
            <span>体型评估</span>
          </div>
          <div className="metric">
            <b>{profile.goal === "maintain" ? "—" : `${deltaKg.toFixed(1)}kg`}</b>
            <span>目标差距</span>
          </div>
        </div>
      </div>

      {view.tier === "free" ? (
        <>
          <div className="card locked-panel">
            <h3>你的专属计划(会员内容)</h3>
            <div className="locked-blur">
              <div className="metric-row" aria-hidden>
                <div className="metric">
                  <b>18XX</b>
                  <span>每日热量 kcal</span>
                </div>
                <div className="metric">
                  <b>0.XX</b>
                  <span>每周变化 kg</span>
                </div>
                <div className="metric">
                  <b>20XX-XX</b>
                  <span>达成日期</span>
                </div>
              </div>
              <svg viewBox="0 0 480 140" width="100%" aria-hidden>
                <polyline
                  points="10,20 90,38 170,60 250,84 330,100 410,116 470,124"
                  fill="none"
                  stroke="#1e6b4e"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="locked-overlay">
              <span className="lock-icon">🔓</span>
              <span>预计 {view.preview.targetMonth.replace("-", " 年 ")} 月达成目标</span>
              <p>{view.upgrade.message}</p>
            </div>
          </div>

          <div className="card">
            <h3>解锁完整计划</h3>
            <div className="plan-picker">
              {view.upgrade.plans.map((p) => (
                <button
                  key={p.plan}
                  className={`plan-option ${plan === p.plan ? "selected" : ""}`}
                  onClick={() => setPlan(p.plan as "MONTHLY" | "YEARLY")}
                >
                  {p.plan === "YEARLY" && <span className="tag">最划算</span>}
                  <b>¥{(p.amountCents / 100).toFixed(0)}</b>
                  <span>{p.plan === "MONTHLY" ? "月度会员" : "年度会员"}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? "正在开通…" : "立即解锁 →"}
            </button>
            <p className="footnote">演示环境:点击即模拟支付成功,不会真实扣款。</p>
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <h3>每日营养方案</h3>
            <div className="metric-row">
              <div className="metric">
                <b>{view.plan.recommendedCalories}</b>
                <span>建议热量 kcal</span>
              </div>
              <div className="metric">
                <b>{view.plan.tdee}</b>
                <span>每日消耗 kcal</span>
              </div>
              <div className="metric">
                <b>{view.plan.bmr}</b>
                <span>基础代谢 kcal</span>
              </div>
            </div>
            <div style={{ height: 10 }} />
            <div className="macro-row">
              <div className="metric">
                <b>{view.plan.macros.proteinG}g</b>
                <span>蛋白质</span>
              </div>
              <div className="metric">
                <b>{view.plan.macros.carbsG}g</b>
                <span>碳水</span>
              </div>
              <div className="metric">
                <b>{view.plan.macros.fatG}g</b>
                <span>脂肪</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>体重预测曲线</h3>
            {view.plan.projection.length > 1 ? (
              <ProjectionChart points={view.plan.projection} />
            ) : (
              <p className="step-sub">保持目标无需变化曲线 — 维持当前节奏即可。</p>
            )}
            <div style={{ height: 10 }} />
            <div className="metric-row">
              <div className="metric">
                <b>{view.plan.weeklyChangeKg > 0 ? "+" : ""}{view.plan.weeklyChangeKg}</b>
                <span>每周变化 kg</span>
              </div>
              <div className="metric">
                <b>{view.plan.weeksToTarget}</b>
                <span>预计周数</span>
              </div>
              <div className="metric">
                <b style={{ fontSize: 15, lineHeight: "33px", whiteSpace: "nowrap" }}>
                  {view.plan.targetDate}
                </b>
                <span>达成日期</span>
              </div>
            </div>
          </div>
        </>
      )}

      <button className="btn btn-ghost" onClick={() => router.push("/")}>
        返回首页
      </button>
    </main>
  );
}
