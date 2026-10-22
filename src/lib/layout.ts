import { useVideoConfig } from "remotion";

/**
 * 横竖版共用一套场景：场景里用 useLayout() 判断画幅，再分别给出位置与字号。
 * 竖版（9:16）要给平台界面留位置：顶部状态栏、底部标题/按钮、右侧点赞栏。
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return {
    portrait,
    W: width,
    H: height,
    /** 内容区左右边距 */
    padX: portrait ? 80 : 140,
    /** 章节标题起始高度 */
    top: portrait ? 200 : 96,
    /** 横版取 a，竖版取 b */
    pick: <T,>(a: T, b: T): T => (portrait ? b : a),
  };
};

export type Layout = ReturnType<typeof useLayout>;
