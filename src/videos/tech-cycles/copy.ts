import type { Seg } from "../../lib/components";
import { color } from "../../lib/theme";

/**
 * 本片全部文案。改字只需要改这里；渲染前会自动预加载这些字符的字体。
 * 核心论点与关键数字均来自 materials/tech-cycles/source。
 */
export const COPY = {
  cold: {
    tag: "NASDAQ COMPOSITE · 2000.03.10",
    label: "纳斯达克综合指数 · 当时的历史最高收盘",
    q1: "如果你在这一天买入，",
    q2: ["要等多久，才能", { t: "回本", color: color.accent }, "？"] as Seg[],
    big: "15 年",
    after: "而这 15 年，正是互联网改变世界的 15 年。",
  },
  title: {
    eyebrow: "THE LONG VIEW · NASDAQ 1981—2026",
    title: "市场的长镜头",
    sub: "三次科技革命的股市曲线",
  },
  three: {
    eyebrow: ["01", "三次科技革命"],
    head: "过去 45 年，三次技术革命",
    items: [
      { key: "pc", name: "PC 革命", date: "1981.08", tag: "IBM PC 上市，电脑走进办公室" },
      { key: "net", name: "互联网革命", date: "1996.01", tag: "世界开始连上网络" },
      { key: "ai", name: "AI 革命", date: "2022.11", tag: "ChatGPT 发布，机器开始对话" },
    ],
    q: "它们都改变了世界。\n可它们的股市曲线，长得一样吗？",
  },
  race: {
    eyebrow: ["02", "同一起跑线"],
    head: "把三次革命的起点，都设为 100",
    base: "起点 = 100",
    month: "第 {n} 个月",
    axis: "从各自起点经过的月份",
    rows: [
      { key: "net", name: "互联网", period: "1996.01—1999.12" },
      { key: "ai", name: "AI", period: "2022.11—2026.10" },
      { key: "pc", name: "PC", period: "1981.08—1985.07" },
    ],
    cap: "同样 48 个月：\n互联网末段几乎垂直，\nAI 的曲线相对平缓。",
    note: "股价速度 ≠ 技术发展速度",
  },
  crash: {
    eyebrow: ["03", "然后"],
    head: "2000 年 3 月，互联网泡沫见顶",
    peak: ["2000.03.10 · 历史峰值", "5,048.62"],
    low: ["2002.10.09 · 底部", "1,114.11"],
    drawdown: "从高点算起的跌幅",
    l1: "互联网没有失败——",
    l2: ["但它的股价，先跌去了", { t: "近八成", color: color.red }, "。"] as Seg[],
  },
  wait: {
    eyebrow: ["04", "漫长的等待"],
    head: "跌下去以后，多久才能回到前高？",
    clockLabel: "距 2000 年高点",
    clock: "第 {n} 年",
    under: "仍低于前高",
    peakLine: "前高 = 100",
    axis: "距前高的年数",
    milestones: [
      { year: "2004", text: "Google 上市" },
      { year: "2007", text: "iPhone 发布" },
      { year: "2008", text: "金融危机，再跌一次" },
      { year: "2011", text: "微信上线" },
      { year: "2014", text: "阿里巴巴美国上市" },
    ],
    recovered: ["2015.04.23", "15 年后，重新站上 2000 年高点"],
    g1987: ["1989.06", "1987 年股灾：不到 2 年回到前高"],
    compare: [
      { year: "1987 股灾", drop: "-33%", wait: "不到 2 年", years: 1.8, tint: color.pc },
      { year: "2000 泡沫", drop: "-78%", wait: "约 15 年", years: 15.1, tint: color.net },
    ],
    cap: "同样是大跌，\n等待的时间\n完全不是一个量级。",
  },
  long: {
    eyebrow: ["05", "拉远镜头"],
    head: "45 年：真实时间轴上的纳斯达克",
    head2: "长期向上的曲线里，也藏着长达 15 年的等待。",
    eras: ["PC 革命", "互联网革命", "AI 革命"],
    events: [
      { t: "1987 股灾", sub: "" },
      { t: "2000 高点", sub: "5,048.62" },
      { t: "2002 低点", sub: "1,114.11" },
      { t: "2008 金融危机", sub: "" },
      { t: "2015 收复前高", sub: "" },
      { t: "当前", sub: "26,424.82" },
    ],
    statLabel: "1981 年初 → 2026.10.20（名义点位）",
    stat: "≈200 → 26,424",
    underwater: "回本等待期 ≈ 15 年",
  },
  ai: {
    eyebrow: ["06", "现在"],
    head: "互联网泡沫 vs. AI 时代",
    head2: "历史形状可以比较，但不能用来机械预测时间。",
    legend: [
      { key: "net", name: "互联网", period: "1996.01 起" },
      { key: "ai", name: "AI", period: "2022.11 起" },
    ],
    gainLabel: "前 48 个月",
    peak: "2000.03 泡沫顶部",
    now: ["2026.10.20", "26,424.82 · +130%"],
    cut: "当前行情截至此处",
    fog: "之后的路径，\n没有人知道。",
    note: "本片不绘制 AI 的任何未来走势",
    axis: "各自起点之后的月份",
  },
  two: {
    a: ["问题 A", "这项技术，\n长期有没有价值？"],
    b: ["问题 B", "今天的资产价格，\n是否合理？"],
    mid: "这是两道不同的题。",
    quote: ["指数最终重新创新高，\n不等于", { t: "每一代投资者", color: color.accent }, "\n都能很快回本。"] as Seg[],
  },
  outro: {
    head: "怎么看这些图，才不会被形状骗了？",
    rules: [
      ["01", "统一基准", "各自起点设为 100，比较的是相对涨跌，不是估值高低。"],
      ["02", "区别历史与预测", "AI 曲线截至 2026.10.20，不含任何虚构的后续走势。"],
      ["03", "留意恢复口径", "“收复前高”指名义价格，不含通胀、分红、税费与成本。"],
      ["04", "不要只看相似度", "成分、利率、利润都在变，泡沫不会按时间表重演。"],
    ],
    mark: "THE LONG VIEW",
    title: "市场的长镜头",
    tagline: "技术可以长期成功，\n资本也可能短期定价错误。",
    footer: "数据：FRED NASDAQCOM · Yahoo Finance ｜ 月末收盘，名义价格 ｜ 截至 2026-10-20 ｜ 历史数据不构成投资建议",
  },
};

/** 收集全部文案字符，供字体预加载 */
export const ALL_TEXT = JSON.stringify(COPY);
