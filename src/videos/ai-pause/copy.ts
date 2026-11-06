import narration from "./narration.json";

/**
 * 《AI 的暂停键》全部画面文案。数字与出处见 materials/us-selloff-2026-11/research.md。
 * 改字只改这里；渲染前会按这些字符预加载字体。
 */
export const COPY = {
  series: "THE LONG VIEW · 03",
  /** 竖版顶部常驻标题栏 / 横版右上角标签 */
  bar: { tag: "11.05 美股暴跌", title: "AI 的暂停键" },
  cover: {
    kicker: "美股大跌拆解",
    line1: "一天蒸发",
    num: "3",
    unit: "万亿美元",
    q: "美国选民按下了 AI 的暂停键？",
    stats: ["纳指 −5.5%", "英伟达 −9.3%", "芯片 −10.4%"],
  },
  chapters: ["蒸发", "过山车", "全线", "为什么", "位置", "你怎么看"],
  hook: {
    tag: "2026.11.05 · THU · 美股收盘",
    day: "一天",
    label: "美股市值蒸发约",
    unit: "万亿美元",
    stamp: "蒸发",
    date: "11 月 5 日",
    worst: "标普 500：2025 年 4 月以来最惨的一天",
  },
  coaster: {
    eyebrow: ["01", "过山车"],
    head: "道指：两天，两个极端",
    days: [
      { date: "11/4 周三", value: "+1,569", pct: "+3.0%" },
      { date: "11/5 周四", value: "−1,833", pct: "−3.4%" },
    ],
    upNote: "中期选举后\n44 年来最好的一天",
    downNote: "收 51,523\n涨幅全部吐回",
    net: "两天净跌 264 点",
    netSub: "比选举日（11/3）收盘还低",
    base: "11/3 收盘",
  },
  board: {
    eyebrow: ["02", "全线"],
    head: "11 月 5 日收盘",
    tiles: [
      { name: "纳斯达克", value: "−5.5%", sub: "收 24,315" },
      { name: "标普 500", value: "−4.4%", sub: "2025 年 4 月以来最差" },
      { name: "半导体 ETF", value: "−10.4%", sub: "2020 年 3 月以来最差" },
      { name: "英伟达", value: "−9.3%", sub: "" },
    ],
    zero: "2026 年涨幅清零",
    foot: "11 个板块全线下跌 · 恐慌指数 VIX +39%",
  },
  why: {
    eyebrow: ["03", "为什么"],
    head: "导火索：11 月 3 日中期选举",
    nodes: [
      { k: "选票", t: "民主党拿下国会", s: "选举结果出炉" },
      { k: "州长", t: "德州、俄亥俄新州长", s: "主张给新建数据中心踩刹车" },
      { k: "工地", t: "数据中心不建了？", s: "暂停令进入多州竞选议题" },
      { k: "芯片", t: "芯片卖给谁？", s: "市场先砍 AI 硬件股" },
    ],
    ubsLabel: "瑞银（UBS）估计",
    big: "近 1/3",
    ubsText: "2028 年计划上线的美国新数据中心\n可能延后，甚至落空",
    ubsNote: "前提：暂停在更多州蔓延",
    gridNote: "示意 · 每格代表 1/30",
  },
  corr: {
    eyebrow: ["04", "位置"],
    head: "纳指进入技术性回调",
    top: "10/6 历史收盘高点 27,599.89",
    marks: [
      { v: 7.8, label: "上期 · 10/30", sub: "−7.8%" },
      { v: 10, label: "技术性回调线", sub: "−10%" },
      { v: 11.9, label: "11/5 · 24,315", sub: "−11.9%" },
    ],
    stamp: "技术性回调",
    prev: { tag: "上期 · 02", title: "AI 的账单", sub: "钱越花越多，现金在流出" },
    now: { tag: "这期 · 03", title: "AI 的暂停键", sub: "连建设本身都可能被暂停" },
  },
  end: {
    q: "错杀，还是转折点？",
    options: [
      { k: "A", t: "错杀", s: "情绪过头，基本面没变" },
      { k: "B", t: "转折点", s: "AI 建设周期开始降速" },
    ],
    comment: "评论区留下你的 A 或 B",
    follow: "关注",
    followSub: "下次大跌，第一时间帮你拆解",
    footer: "资料：AP · CNBC · Fortune · Yahoo Finance · Fox Business · Texas Tribune · The Information · UBS ｜ 截至 2026-11-05 收盘 ｜ 不构成投资建议",
  },
};

/** 收集全部文案字符（含旁白），供字体预加载 */
export const ALL_TEXT = JSON.stringify(COPY) + narration.lines.map((l) => l.text).join("") + "▲▼+−$≈↓→0123456789";
