/**
 * MLT 파일 파서.
 * MLT = Multi-Line Text, 일본 AA 커뮤니티의 AA 모음 파일 형식.
 * [SPLIT]으로 항목 구분.
 * trim 후 비공백 줄이 1줄뿐인 블록은 섹션 헤더로 판별.
 * 읽기 전용 — 앱에서 수정하지 않음.
 */

export interface MltEntry {
  name: string;
  text: string;
  isSection: boolean;
}

function isSectionHeader(block: string): boolean {
  const trimmed = block.trim();
  if (!trimmed) return false;
  const lines = trimmed.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  return nonEmpty.length === 1 && lines.length === 1;
}

export function parseMLT(content: string): MltEntry[] {
  const entries: MltEntry[] = [];
  const cleaned = content.replace(/\uFEFF/g, "").replace(/\r/g, "");
  const blocks = cleaned.split("[SPLIT]");

  for (const block of blocks) {
    if (!block.trim()) continue;

    const section = isSectionHeader(block);

    const aaIdx = block.indexOf("[AA]");
    if (aaIdx === -1) {
      const text = block.replace(/\n+$/, "");
      if (text.length > 0) {
        entries.push({
          name: section ? block.trim() : "",
          text: section ? "" : text,
          isSection: section,
        });
      }
      continue;
    }

    const name = block.substring(0, aaIdx).trim();
    const text = block.substring(aaIdx + 4).replace(/\n+$/, "");
    if (text.trim().length > 0) {
      entries.push({ name, text, isSection: false });
    }
  }

  return entries;
}
