import type { OpaqueRange } from "../types/project";

/** 같은 줄의 겹치는 범위를 병합 */
export function mergeOpaqueRanges(ranges: OpaqueRange[]): OpaqueRange[] {
  if (ranges.length === 0) return [];
  const byLine = new Map<number, OpaqueRange[]>();
  ranges.forEach(r => {
    const arr = byLine.get(r.line) || [];
    arr.push(r);
    byLine.set(r.line, arr);
  });
  const result: OpaqueRange[] = [];
  byLine.forEach((lineRanges) => {
    lineRanges.sort((a, b) => a.startCol - b.startCol);
    let cur = { ...lineRanges[0] };
    for (let i = 1; i < lineRanges.length; i++) {
      const r = lineRanges[i];
      if (r.startCol <= cur.endCol) {
        cur.endCol = Math.max(cur.endCol, r.endCol);
      } else {
        result.push(cur);
        cur = { ...r };
      }
    }
    result.push(cur);
  });
  return result;
}

/** 기존 범위에서 제거 범위를 빼기 */
export function subtractOpaqueRanges(existing: OpaqueRange[], toRemove: OpaqueRange[]): OpaqueRange[] {
  let result = [...existing];
  for (const rem of toRemove) {
    const next: OpaqueRange[] = [];
    for (const r of result) {
      if (r.line !== rem.line || r.endCol <= rem.startCol || r.startCol >= rem.endCol) {
        next.push(r);
      } else {
        if (r.startCol < rem.startCol) {
          next.push({ line: r.line, startCol: r.startCol, endCol: rem.startCol });
        }
        if (r.endCol > rem.endCol) {
          next.push({ line: r.line, startCol: rem.endCol, endCol: r.endCol });
        }
      }
    }
    result = next;
  }
  return result;
}
