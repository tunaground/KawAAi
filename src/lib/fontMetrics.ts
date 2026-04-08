/**
 * 폰트 메트릭 측정용 오프스크린 Canvas.
 * DOM과 무관하게 문자 폭을 측정.
 * 합성, 스냅 그리드(SNAP_X), 레이어 최소 크기 계산 등에 사용.
 */

export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_LINE_HEIGHT = 18;
export const LAYER_PADDING = 4;
export const CANVAS_MARGIN = 30;

/** fontSize로부터 기본 lineHeight를 계산 (잠금 상태 비율) */
export function deriveLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.125);
}

/** CSS --font-aa와 동일한 폰트 폴백 체인 */
export const CANVAS_FONT =
  '"ＭＳ Ｐゴシック", "MS PGothic", "IPAMonaPGothic", Mona, Monapo, Saitamaar, NanumGothicCoding, monospace';

/** fontSize별 측정 컨텍스트 캐시 */
const measureCtxMap = new Map<number, CanvasRenderingContext2D>();

export function getMeasureCtx(fontSize: number = DEFAULT_FONT_SIZE): CanvasRenderingContext2D {
  let ctx = measureCtxMap.get(fontSize);
  if (!ctx) {
    const canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d")!;
    ctx.font = `${fontSize}px ${CANVAS_FONT}`;
    measureCtxMap.set(fontSize, ctx);
  }
  return ctx;
}

export function measureCharWidth(char: string, fontSize: number = DEFAULT_FONT_SIZE): number {
  return getMeasureCtx(fontSize).measureText(char).width;
}

/** 문자열의 각 문자별 { char, x좌표, 폭 }을 반환 */
export function measureString(
  str: string,
  fontSize: number = DEFAULT_FONT_SIZE,
): { char: string; x: number; width: number }[] {
  const ctx = getMeasureCtx(fontSize);
  const chars = [...str];
  const result: { char: string; x: number; width: number }[] = [];
  let x = 0;
  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    result.push({ char: ch, x, width: w });
    x += w;
  }
  return result;
}
