/**
 * MLT 익스포터.
 * 프로젝트의 네임스페이스/문서를 MLT 형식으로 변환.
 */
import type { ProjectFile } from "../types/project";
import { compositeLayers } from "./compositor";

export function exportToMLT(project: ProjectFile): string {
  const parts: string[] = [];

  for (const ns of project.namespaces) {
    // 섹션 헤더
    parts.push(ns.name);
    parts.push("[SPLIT]");

    // 각 문서를 합성하여 AA 항목으로
    for (const docId of ns.docIds) {
      const doc = project.documents.find((d) => d.id === docId);
      if (!doc) continue;

      const lines = compositeLayers(doc.layers, doc.fontSize ?? 16, doc.lineHeight ?? 18);
      const text = lines.join("\n");
      if (text.trim().length === 0) continue;

      parts.push(text);
      parts.push("[SPLIT]");
    }
  }

  return parts.join("\n");
}
