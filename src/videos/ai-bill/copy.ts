import narration from "./narration.json";

/**
 * 《AI 的账单》全部画面文案。数字与出处见 materials/us-selloff-2026-10/research.md。
 * 改字只改这里；渲染前会按这些字符预加载字体。
 */
export const COPY = {
  series: "THE LONG VIEW · 02",
  cold: {
    tag: "FRIDAY · 2026.10.30",
    stats: [
      { label: "纳斯达克综合指数", value: "−2.9%", sub: "6 月以来最大单日跌幅" },
      { label: "费城半导体指数", value: "−7%", sub: "5 月以来最低" },
      { label: "英特尔", value: "−28.6%", sub: "1974 年以来最差一天" },
    ],
  },
  title: { title: "AI 的账单", sub: "美股这次为什么跌" },
  scope: {
    eyebrow: ["01", "跌了多少"],
    big: "−7.8%",
    bigLabel: "纳斯达克距 10 月 6 日历史收盘高点",
    high: "10/6 高点 27,599.89",
    rows: [
      { name: "纳斯达克", when: "10/30", value: "−2.9%", up: false, note: "" },
      { name: "标普 500", when: "10/30", value: "−1.8%", up: false, note: "" },
      { name: "道琼斯", when: "10 月全月", value: "上涨", up: true, note: "" },
      { name: "美国国债", when: "10 月", value: "上涨", up: true, note: "10 年期收益率近三年最大月降幅" },
    ],
    cap: "跌的是 AI 和科技巨头",
  },
  earnings: {
    eyebrow: ["02", "导火索"],
    head: "一周财报：业务在涨，股价在跌",
    growthLabel: "增长",
    stockLabel: "股价",
    cards: [
      { name: "Alphabet", date: "10/28", growth: ["营收 +25%", "云业务 +103%"], stock: "跌超 10%", note: "" },
      { name: "亚马逊", date: "10/29", growth: ["营收 +12%", "AWS +39%"], stock: "盘后跌超 6%", note: "" },
      { name: "英特尔", date: "10/29", growth: ["三季度营收 +21%", "业绩超预期"], stock: "−28.6%", note: "四季度指引 150–160 亿美元\n低于预期的约 170 亿" },
    ],
  },
  cash: {
    eyebrow: ["03", "问题在哪"],
    head: "增长，不等于现金",
    unit: "亿美元",
    alphabetTitle: "Alphabet · 2026 年三季度",
    alphabetBars: ["经营现金流", "资本开支", "自由现金流"],
    amazonTitle: "亚马逊 · 过去 12 个月自由现金流",
    amazonBars: ["一年前", "现在"],
    fundLabel: "钱从哪来（Alphabet 本季）",
    fund: ["发债 287 亿美元", "卖新股 124 亿美元"],
    stamp: "回购 0",
  },
  bill: {
    eyebrow: ["04", "账单"],
    head: "账单还在变大，钱却在变贵",
    capexLabel: "2026 年资本开支计划（亿美元）",
    towers: [
      { name: "亚马逊", value: "≈2,200" },
      { name: "微软", value: "≈1,700" },
      { name: "Meta", value: "≤1,450" },
    ],
    goldman: { label: "高盛估算\n五大云厂商明年的 AI 投入", big: "1.2 万亿美元", sub: "要回本，每年约需\n3,000 亿美元 AI 收入" },
    moneyLabel: "钱在变贵",
    oil: { label: "布伦特原油 · 10/30", big: "$117.64", sub: "10 月 +13.6% · 伊朗战争" },
    fed: { label: "美联储 · 10 月按兵不动", big: "2 票主张加息", sub: "市场押注 12 月加息：七成以上" },
  },
  camps: {
    eyebrow: ["05", "外网怎么看"],
    bull: {
      tag: "乐观派",
      items: [
        { who: "Fundstrat · 汤姆·李", say: "健康的回调，逢低买入" },
        { who: "Raymond James", say: "该停下来想一想，\n而不是清算时刻" },
      ],
    },
    bear: {
      tag: "谨慎派",
      items: [
        { who: "摩根士丹利", say: "生产率迟迟不到，\n杠杆会比产出涨得更快" },
        { who: "Piper Sandler", say: "不急着抄底" },
      ],
    },
  },
  long: {
    eyebrow: ["06", "拉远镜头"],
    head: "纳斯达克从高点的跌幅",
    bars: [
      { label: "2026 年 10 月", value: 7.8, note: "至 10/30" },
      { label: "2020 疫情", value: 30.4, note: "" },
      { label: "2022 加息", value: 35.9, note: "" },
      { label: "2008 金融危机", value: 55.5, note: "" },
      { label: "2000 互联网泡沫", value: 78, note: "" },
    ],
    note: "价格口径 · 峰谷跌幅",
    line: "决定能跌多深的，从来是价格和现金。",
  },
  end: {
    title: "AI 的账单",
    watchLabel: "接下来看",
    watch: ["科技巨头的现金流与资本开支", "12 月美联储会议", "油价与霍尔木兹海峡"],
    footer: "资料：Reuters · Bloomberg · CNBC · 公司财报 · Goldman Sachs · Morgan Stanley ｜ 截至 2026-10-30 ｜ 不构成投资建议",
  },
};

/** 收集全部文案字符（含旁白），供字体预加载 */
export const ALL_TEXT = JSON.stringify(COPY) + narration.lines.map((l) => l.text).join("") + "▲▼+−0123456789";
