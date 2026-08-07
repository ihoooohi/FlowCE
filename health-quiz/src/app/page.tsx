import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        轻盈计划
      </div>

      <section className="hero">
        <h1>
          3 分钟,拿到一份
          <br />
          <em>真正属于你</em>的健康计划
        </h1>
        <p>
          回答 4 个小问题,我们据你的身体数据计算 BMI、每日热量建议,
          并预测你达成目标体重的日期。
        </p>
      </section>

      <div className="badge-row">
        <span className="badge">🔒 匿名填写,无需注册</span>
        <span className="badge">⏱ 平均 3 分钟完成</span>
        <span className="badge">📈 科学公式计算</span>
      </div>

      <div className="stat-strip">
        <div className="stat">
          <b>250万+</b>
          <span>已生成计划</span>
        </div>
        <div className="stat">
          <b>4.8 / 5</b>
          <span>用户评分</span>
        </div>
        <div className="stat">
          <b>-5.2kg</b>
          <span>90 天平均改变</span>
        </div>
      </div>

      <Link href="/quiz" className="btn btn-primary">
        开始我的测评 →
      </Link>
      <p className="footnote">中途退出也没关系,你的进度会自动保存。</p>
    </main>
  );
}
