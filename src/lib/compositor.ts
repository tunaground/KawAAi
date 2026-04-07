/**
 * 레이어 합성 엔진.
 *
 * 알고리즘:
 * 1. 모든 visible 텍스트 레이어를 순회 (이미지 레이어 제외)
 * 2. 각 레이어의 각 문자를 measureText()로 픽셀 x좌표 계산
 * 3. 전체 문자를 x좌표 기준으로 정렬
 * 4. 겹치는 위치에서는 상위 레이어(layerIndex 큰 쪽)가 우선
 * 5. 문자 사이 빈 공간을 fillGap()으로 유니코드 스페이스 조합으로 채움
 *
 * 핵심 원칙:
 *   - 공백 문자 = 투명 (아래 레이어가 비침)
 *   - 비공백 문자 = 불투명 (위 레이어가 아래를 덮음)
 *   - 프로포셔널 폰트이므로 "몇 번째 칸"이 아닌 픽셀 좌표 기반
 */

import type { Layer, OpaqueRange } from "../types/project";
import { getMeasureCtx, measureString, LINE_HEIGHT, LAYER_PADDING } from "./fontMetrics";

/** 합성용 공백 문자 목록. initSpaceWidths()에서 폭 측정 후 넓은 순 정렬. */
const SPACE_CHARS = [
  { char: "\u200A", name: "Hair" },
  { char: "\u2009", name: "Thin" },
  { char: "\u2006", name: "6/em" },
  { char: "\u2005", name: "4/em" },
  { char: " ", name: "SP" },
  { char: "\u2004", name: "3/em" },
  { char: "\u2002", name: "En" },
  { char: "\u2003", name: "Em" },
  { char: "\u3000", name: "Ideo" },
];

let spaceWidths: { char: string; name: string; width: number }[] = [];

/** 반각 스페이스 폭 = X축 스냅 그리드 단위 */
let _snapX = 1;
export function getSnapX(): number {
  return _snapX;
}

/** 폰트 로딩 후 호출. 각 스페이스 문자의 실제 폭 측정 + SNAP_X 계산. */
export function initSpaceWidths(): void {
  const ctx = getMeasureCtx();
  spaceWidths = SPACE_CHARS.map((s) => ({
    ...s,
    width: ctx.measureText(s.char).width,
  })).sort((a, b) => b.width - a.width); // greedy fill용 넓은 순 정렬

  _snapX = ctx.measureText(" ").width;
}

/** 캐릭터 포지션이 불투명 범위에 속하는지 체크 */
function isInOpaqueRange(line: number, col: number, ranges: OpaqueRange[]): boolean {
  return ranges.some(r => r.line === line && col >= r.startCol && col < r.endCol);
}

/** 유니코드 공백 문자인지 판별. 합성 시 "투명"으로 취급. */
function isTransparent(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    code === 0x0020 || code === 0x00a0 ||
    (code >= 0x2000 && code <= 0x200b) ||
    code === 0x3000
  );
}

/**
 * targetWidth 픽셀에 가장 가까운 유니코드 스페이스 조합을 반환.
 * greedy: 넓은 것부터 빼가며 채움. tolerance=0.5px.
 */
function fillGap(targetWidth: number): { str: string; actualWidth: number } {
  if (targetWidth < 0.1) return { str: "", actualWidth: 0 };
  let remaining = targetWidth;
  let result = "";
  let actualWidth = 0;
  const tolerance = 0.5;

  for (const sp of spaceWidths) {
    while (remaining >= sp.width - tolerance) {
      result += sp.char;
      actualWidth += sp.width;
      remaining -= sp.width;
    }
  }
  return { str: result, actualWidth };
}

interface Placement {
  char: string;
  x: number;
  width: number;
  layerIndex: number;
}

/** 전체 합성: 모든 visible 텍스트 레이어를 합쳐 최종 AA 텍스트 생성. */
export function compositeLayers(layers: Layer[]): string[] {
  const visibleLayers = layers.filter((l) => l.visible && l.type === "text");
  if (visibleLayers.length === 0) return [];

  let maxPixelLine = 0;
  visibleLayers.forEach((layer) => {
    const lineCount = layer.text.split("\n").length;
    const bottomPx = layer.y + LAYER_PADDING + lineCount * LINE_HEIGHT;
    maxPixelLine = Math.max(maxPixelLine, bottomPx);
  });

  const totalLines = Math.ceil(maxPixelLine / LINE_HEIGHT);
  const resultLines: string[] = [];

  for (let lineIdx = 0; lineIdx < totalLines; lineIdx++) {
    const lineTopPx = lineIdx * LINE_HEIGHT;
    const placements: Placement[] = [];

    visibleLayers.forEach((layer, layerIdx) => {
      const layerLines = layer.text.split("\n");
      const layerLineIdx = Math.round(
        (lineTopPx - layer.y - LAYER_PADDING) / LINE_HEIGHT
      );
      if (layerLineIdx < 0 || layerLineIdx >= layerLines.length) return;

      const expectedPx = layer.y + LAYER_PADDING + layerLineIdx * LINE_HEIGHT;
      if (Math.abs(expectedPx - lineTopPx) > LINE_HEIGHT / 2) return;

      const lineText = layerLines[layerLineIdx];
      const measured = measureString(lineText);
      const layerXOffset = layer.x + LAYER_PADDING;

      measured.forEach((m, charIndex) => {
        if (!isTransparent(m.char)) {
          placements.push({
            char: m.char,
            x: m.x + layerXOffset,
            width: m.width,
            layerIndex: layerIdx,
          });
        } else if (
          layer.opaqueRanges?.length > 0 &&
          isInOpaqueRange(layerLineIdx, charIndex, layer.opaqueRanges)
        ) {
          // 공백이지만 불투명 채색 영역 → placement 추가 (하위 레이어 차단)
          placements.push({
            char: m.char,
            x: m.x + layerXOffset,
            width: m.width,
            layerIndex: layerIdx,
          });
        }
      });
    });

    if (placements.length === 0) {
      resultLines.push("");
      continue;
    }

    placements.sort((a, b) => a.x - b.x || a.layerIndex - b.layerIndex);

    // 겹침 해소: 상위 레이어(layerIndex 큰 쪽)가 우선
    const resolved: Placement[] = [];
    for (const p of placements) {
      let dominated = false;
      for (let i = resolved.length - 1; i >= 0; i--) {
        const r = resolved[i];
        if (p.x < r.x + r.width && p.x + p.width > r.x) {
          if (p.layerIndex > r.layerIndex) {
            resolved.splice(i, 1);
          } else {
            dominated = true;
            break;
          }
        }
      }
      if (!dominated) resolved.push(p);
    }

    resolved.sort((a, b) => a.x - b.x);

    // 빈 공간을 유니코드 스페이스 조합으로 채움
    let output = "";
    let currentX = 0;
    for (const p of resolved) {
      const gap = p.x - currentX;
      if (gap > 0.5) {
        output += fillGap(gap).str;
      }
      output += p.char;
      currentX = p.x + p.width;
    }

    resultLines.push(output);
  }

  // 후행 빈 줄 제거
  while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === "") {
    resultLines.pop();
  }

  return resultLines;
}

/** 병합용: 선택된 레이어만 합성. origin 보정으로 불필요한 여백 제거. */
export function compositeLayersSubset(
  subset: Layer[],
  originX = 0,
  originY = 0
): string[] {
  let maxPixelLine = 0;
  subset.forEach((layer) => {
    const lineCount = layer.text.split("\n").length;
    const bottomPx =
      layer.y - originY + LAYER_PADDING + lineCount * LINE_HEIGHT;
    maxPixelLine = Math.max(maxPixelLine, bottomPx);
  });

  const totalLines = Math.ceil(maxPixelLine / LINE_HEIGHT);
  const resultLines: string[] = [];

  for (let lineIdx = 0; lineIdx < totalLines; lineIdx++) {
    const lineTopPx = lineIdx * LINE_HEIGHT;
    const placements: Placement[] = [];

    subset.forEach((layer, layerIdx) => {
      const layerLines = layer.text.split("\n");
      const relY = layer.y - originY;
      const layerLineIdx = Math.round(
        (lineTopPx - relY - LAYER_PADDING) / LINE_HEIGHT
      );
      if (layerLineIdx < 0 || layerLineIdx >= layerLines.length) return;

      const expectedPx = relY + LAYER_PADDING + layerLineIdx * LINE_HEIGHT;
      if (Math.abs(expectedPx - lineTopPx) > LINE_HEIGHT / 2) return;

      const lineText = layerLines[layerLineIdx];
      const measured = measureString(lineText);
      const layerXOffset = layer.x - originX + LAYER_PADDING;

      measured.forEach((m, charIndex) => {
        if (!isTransparent(m.char)) {
          placements.push({
            char: m.char,
            x: m.x + layerXOffset,
            width: m.width,
            layerIndex: layerIdx,
          });
        } else if (
          layer.opaqueRanges?.length > 0 &&
          isInOpaqueRange(layerLineIdx, charIndex, layer.opaqueRanges)
        ) {
          placements.push({
            char: m.char,
            x: m.x + layerXOffset,
            width: m.width,
            layerIndex: layerIdx,
          });
        }
      });
    });

    if (placements.length === 0) {
      resultLines.push("");
      continue;
    }

    placements.sort((a, b) => a.x - b.x || a.layerIndex - b.layerIndex);

    const resolved: Placement[] = [];
    for (const p of placements) {
      let dominated = false;
      for (let i = resolved.length - 1; i >= 0; i--) {
        const r = resolved[i];
        if (p.x < r.x + r.width && p.x + p.width > r.x) {
          if (p.layerIndex > r.layerIndex) {
            resolved.splice(i, 1);
          } else {
            dominated = true;
            break;
          }
        }
      }
      if (!dominated) resolved.push(p);
    }

    resolved.sort((a, b) => a.x - b.x);

    let output = "";
    let currentX = 0;
    for (const p of resolved) {
      const gap = p.x - currentX;
      if (gap > 0.5) output += fillGap(gap).str;
      output += p.char;
      currentX = p.x + p.width;
    }
    resultLines.push(output);
  }

  while (
    resultLines.length > 0 &&
    resultLines[resultLines.length - 1].trim() === ""
  ) {
    resultLines.pop();
  }

  return resultLines;
}
