/**
 * 폰트 메트릭 측정용 오프스크린 Canvas.
 * DOM과 무관하게 문자 폭을 측정.
 * 합성, 스냅 그리드(SNAP_X), 레이어 최소 크기 계산 등에 사용.
 */

export const FONT_SIZE = 16;
export const LINE_HEIGHT = 18;
export const LAYER_PADDING = 4;
export const CANVAS_MARGIN = 30;

/** CSS --font-aa와 동일한 폰트 폴백 체인 */
export const CANVAS_FONT =
  '"ＭＳ Ｐゴシック", "MS PGothic", "IPAMonaPGothic", Mona, Monapo, Saitamaar, NanumGothicCoding, monospace';

let measureCtx: CanvasRenderingContext2D | null = null;

export function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d")!;
    measureCtx.font = `${FONT_SIZE}px ${CANVAS_FONT}`;
  }
  return measureCtx;
}

export function measureCharWidth(char: string): number {
  return getMeasureCtx().measureText(char).width;
}

/** 문자열의 각 문자별 { char, x좌표, 폭 }을 반환 */
export function measureString(
  str: string
): { char: string; x: number; width: number }[] {
  const ctx = getMeasureCtx();
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
