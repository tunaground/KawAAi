/**
 * 스페이스 압축 최적화.
 * 레이어 텍스트에서 연속된 공백 문자 구간이 16px 이상이면
 * U+2003(Em Space, 16px) + 나머지로 교체하여 캐릭터 수를 절약.
 * opaqueRanges(채색)에 포함된 공백은 압축하지 않으며,
 * 압축으로 문자 수가 변하면 opaqueRanges의 col 인덱스도 보정.
 */

import { measureString, measureCharWidth } from "./fontMetrics";
import { isTransparent } from "./compositor";
import type { OpaqueRange } from "../types/project";

const EM_SPACE = "\u2003";

/**
 * 나머지 폭을 가장 적은 캐릭터 수로 채움.
 */
function fillRemainder(targetWidth: number, fontSize: number): string {
  if (targetWidth < 0.5) return "";

  const spaces = [
    "\u200A", // Hair ~1px
    "\u2009", // Thin ~2px
    "\u2006", // 6/em ~3px
    "\u2005", // 4/em ~4px
    " ",      // SP   ~5px
  ];

  const measured = spaces.map(ch => ({
    char: ch,
    width: measureCharWidth(ch, fontSize),
  })).sort((a, b) => b.width - a.width);

  let remaining = targetWidth;
  let result = "";
  const tolerance = 0.5;

  for (const sp of measured) {
    while (remaining >= sp.width - tolerance) {
      result += sp.char;
      remaining -= sp.width;
    }
  }
  return result;
}

/** col이 해당 줄의 opaqueRange에 속하는지 체크 */
function isOpaque(lineIdx: number, col: number, ranges: OpaqueRange[]): boolean {
  return ranges.some(r => r.line === lineIdx && col >= r.startCol && col < r.endCol);
}

/** 한 줄의 텍스트를 압축하고 col 매핑을 반환 */
function optimizeLine(
  line: string,
  lineIdx: number,
  fontSize: number,
  emWidth: number,
  opaqueRanges: OpaqueRange[],
): { text: string; colMap: number[] } {
  // colMap[oldCol] = newCol — 원본 col에 대응하는 새 col
  const colMap: number[] = [];

  if (line.length === 0) return { text: line, colMap };

  const chars = [...line];
  const measured = measureString(line, fontSize);
  let result = "";
  let newCol = 0;
  let i = 0;

  while (i < chars.length) {
    if (isTransparent(chars[i]) && !isOpaque(lineIdx, i, opaqueRanges)) {
      // 연속 투명 + 비opaque 문자 구간 수집
      let spanWidth = 0;
      const spanStart = i;
      while (i < chars.length && isTransparent(chars[i]) && !isOpaque(lineIdx, i, opaqueRanges)) {
        spanWidth += measured[i].width;
        colMap[i] = newCol; // 압축 구간 내 모든 원본 col → 압축 시작 col
        i++;
      }

      if (spanWidth >= emWidth - 0.5) {
        const emCount = Math.floor((spanWidth + 0.5) / emWidth);
        const remainder = spanWidth - emCount * emWidth;
        for (let e = 0; e < emCount; e++) result += EM_SPACE;
        result += fillRemainder(remainder, fontSize);
        newCol = [...result].length;
      } else {
        for (let j = spanStart; j < i; j++) {
          colMap[j] = newCol;
          result += chars[j];
          newCol++;
        }
      }
    } else {
      colMap[i] = newCol;
      result += chars[i];
      newCol++;
      i++;
    }
  }
  // 끝 위치용 (endCol이 chars.length인 경우)
  colMap[chars.length] = newCol;

  return { text: result, colMap };
}

/** 레이어 텍스트 + opaqueRanges를 최적화. */
export function optimizeLayerSpaces(
  text: string,
  fontSize: number,
  opaqueRanges: OpaqueRange[] = [],
): { text: string; opaqueRanges: OpaqueRange[] } {
  const emWidth = measureCharWidth(EM_SPACE, fontSize);
  if (emWidth < 1) return { text, opaqueRanges };

  const lines = text.split("\n");
  const optimizedLines: string[] = [];
  const colMaps: number[][] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const { text: optimized, colMap } = optimizeLine(lines[lineIdx], lineIdx, fontSize, emWidth, opaqueRanges);
    optimizedLines.push(optimized);
    colMaps.push(colMap);
  }

  // opaqueRanges 보정
  const adjustedRanges: OpaqueRange[] = [];
  for (const r of opaqueRanges) {
    if (r.line >= colMaps.length) continue;
    const map = colMaps[r.line];
    const newStart = map[r.startCol] ?? map[map.length - 1] ?? r.startCol;
    const newEnd = map[r.endCol] ?? map[map.length - 1] ?? r.endCol;
    if (newStart < newEnd) {
      adjustedRanges.push({ line: r.line, startCol: newStart, endCol: newEnd });
    }
  }

  return { text: optimizedLines.join("\n"), opaqueRanges: adjustedRanges };
}
