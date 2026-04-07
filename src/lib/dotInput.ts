/**
 * 도트 문자 (스페이스바 순환 입력).
 * 스페이스바를 누를 때마다 이전 도트를 교체하면서 점점 넓은 공백으로 순환.
 * 9개 1사이클, 사이클 넘어가면 가장 넓은 도트를 앞에 누적.
 * AA에서 미세 간격 조정에 필수적인 기능.
 */

export const DOTS = [
  "\u200A", // 1: Hair Space
  "\u2009", // 2: Thin Space
  "\u2006", // 3: Six-Per-Em Space
  "\u2005", // 4: Four-Per-Em Space
  " ", // 5: Space (U+0020)
  " \u200A", // 6: Space + Hair
  " \u2009", // 7: Space + Thin
  " \u2006", // 8: Space + Six-Per-Em
  " \u2005", // 9: Space + Four-Per-Em
];

/**
 * index번째 도트 문자열 생성.
 * 예: index=0 → Hair, index=9 → Four-Per-Em+Hair (2사이클 시작)
 */
export function getDotString(index: number): string {
  const cycleCount = Math.floor(index / DOTS.length);
  const dotIndex = index % DOTS.length;
  let result = "";
  for (let i = 0; i < cycleCount; i++) {
    result += DOTS[DOTS.length - 1]; // 가장 넓은 도트를 사이클 수만큼 앞에 추가
  }
  result += DOTS[dotIndex];
  return result;
}
