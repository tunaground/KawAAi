/**
 * MLT 파일 파서.
 * MLT = Multi-Line Text, 일본 AA 커뮤니티의 AA 모음 파일 형식.
 * [SPLIT]으로 항목 구분, [AA] 태그 이후가 실제 AA 본문.
 * 읽기 전용 — 앱에서 수정하지 않음.
 */

export interface MltEntry {
  name: string;
  text: string;
}

export function parseMLT(content: string): MltEntry[] {
  const entries: MltEntry[] = [];
  // BOM 제거 + 캐리지리턴(\r) 제거 — MLT 파일은 Windows 환경에서 작성된 경우가 많음
  const cleaned = content.replace(/\uFEFF/g, "").replace(/\r/g, "");
  const blocks = cleaned.split("[SPLIT]");

  for (const block of blocks) {
    if (!block.trim()) continue;

    const aaIdx = block.indexOf("[AA]");
    if (aaIdx === -1) {
      // [AA] 태그 없음 — 블록 전체를 텍스트로 취급 (끝 개행만 제거)
      const text = block.replace(/\n+$/, "");
      if (text.length > 0) {
        entries.push({ name: "", text });
      }
      continue;
    }

    const name = block.substring(0, aaIdx).trim();
    // [AA] 이후 텍스트 그대로 보존, 끝 개행만 제거
    const text = block.substring(aaIdx + 4).replace(/\n+$/, "");
    if (text.trim().length > 0) {
      entries.push({ name, text });
    }
  }

  return entries;
}
