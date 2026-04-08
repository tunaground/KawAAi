/**
 * 도트 문자 (스페이스바 순환 입력).
 * 스페이스바를 누를 때마다 이전 도트를 교체하면서 점점 넓은 공백으로 순환.
 * 16개 1사이클 (1~16px). 16번째에서 U+2003(Em Space, 16px) 1캐릭터로 교체.
 * 사이클이 넘어가면 Em Space를 앞에 누적하여 캐릭터 수를 절약.
 *
 * 기본 단위: Hair(1), Thin(2), 6/em(3), 4/em(4), SP(5)
 *
 * 1사이클 (1~16px):
 *   1, 2, 3, 4, 5, 5+1, 5+2, 5+3, 5+4, 5+5,
 *   5+5+1, 5+5+2, 5+5+3, 5+5+4, 5+5+5, Em
 * 2사이클 (17~32px):
 *   Em+1, Em+2, ... Em+5+5+5, Em+Em
 */

export const DOTS = [
  "\u200A",          //  1: Hair              (1px)
  "\u2009",          //  2: Thin              (2px)
  "\u2006",          //  3: 6/em              (3px)
  "\u2005",          //  4: 4/em              (4px)
  " ",               //  5: SP                (5px)
  " \u200A",         //  6: SP+Hair           (6px)
  " \u2009",         //  7: SP+Thin           (7px)
  " \u2006",         //  8: SP+6/em           (8px)
  " \u2005",         //  9: SP+4/em           (9px)
  "  ",              // 10: SP+SP             (10px)
  "  \u200A",        // 11: SP+SP+Hair        (11px)
  "  \u2009",        // 12: SP+SP+Thin        (12px)
  "  \u2006",        // 13: SP+SP+6/em        (13px)
  "  \u2005",        // 14: SP+SP+4/em        (14px)
  "   ",             // 15: SP+SP+SP          (15px)
  "\u2003",          // 16: Em Space          (16px)
];

/**
 * index번째 도트 문자열 생성.
 * 예: index=0 → Hair(1px), index=16 → Em+Hair(17px)
 */
export function getDotString(index: number): string {
  const cycleCount = Math.floor(index / DOTS.length);
  const dotIndex = index % DOTS.length;
  let result = "";
  for (let i = 0; i < cycleCount; i++) {
    result += "\u2003";
  }
  result += DOTS[dotIndex];
  return result;
}
