/**
 * Tauri 파일 I/O 래퍼.
 * 프로젝트/문서/팔레트/MLT/텍스트 파일 저장/불러오기.
 * 다이얼로그는 @tauri-apps/plugin-dialog 사용.
 */

import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { ProjectFile } from "../types/project";
import type { AppConfig } from "../types/config";
import type { PaletteSetFile } from "../types/palette";

// ── 프로젝트 (.aaproj) ──

export async function saveProjectDialog(project: ProjectFile): Promise<string | null> {
  const path = await save({
    defaultPath: `${project.name}.aaproj`,
    filters: [{ name: "KawAAi Project", extensions: ["aaproj"] }],
  });
  if (!path) return null;
  await invoke("save_project", { path, data: project });
  return path;
}

export async function saveProjectToPath(path: string, project: ProjectFile): Promise<void> {
  await invoke("save_project", { path, data: project });
}

export async function openProjectDialog(): Promise<{ path: string; data: ProjectFile } | null> {
  const path = await open({
    filters: [{ name: "KawAAi Project", extensions: ["aaproj"] }],
    multiple: false,
  });
  if (!path) return null;
  const data = await invoke<ProjectFile>("load_project", { path });
  return { path: path as string, data };
}

// ── AppConfig ──

export async function loadConfig(): Promise<AppConfig | null> {
  const data = await invoke<AppConfig | null>("load_config");
  return data;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await invoke("save_config", { data: config });
}

// ── 팔레트세트 (.aapals) ──

export async function loadPaletteSet(): Promise<PaletteSetFile | null> {
  const data = await invoke<PaletteSetFile | null>("load_palette_set");
  return data;
}

export async function savePaletteSet(data: PaletteSetFile): Promise<void> {
  await invoke("save_palette_set", { data });
}

// ── 문서 export/import (.aadoc) ──

export async function exportDocumentDialog(doc: object): Promise<void> {
  const path = await save({
    filters: [{ name: "KawAAi Document", extensions: ["aadoc"] }],
  });
  if (!path) return;
  await invoke("save_json_file", { path, data: doc });
}

export async function importDocumentDialog(): Promise<object | null> {
  const path = await open({
    filters: [{ name: "KawAAi Document", extensions: ["aadoc"] }],
    multiple: false,
  });
  if (!path) return null;
  return await invoke<object>("load_json_file", { path: path as string });
}

// ── 팔레트 export/import (.aapal) ──

export async function exportPaletteDialog(palette: object): Promise<void> {
  const path = await save({
    filters: [{ name: "KawAAi Palette", extensions: ["aapal"] }],
  });
  if (!path) return;
  await invoke("save_json_file", { path, data: palette });
}

export async function importPaletteDialog(): Promise<object | null> {
  const path = await open({
    filters: [{ name: "KawAAi Palette", extensions: ["aapal"] }],
    multiple: false,
  });
  if (!path) return null;
  return await invoke<object>("load_json_file", { path: path as string });
}

// ── 텍스트 export (.txt) ──

export async function exportTextDialog(content: string): Promise<void> {
  const path = await save({
    filters: [{ name: "Text File", extensions: ["txt"] }],
  });
  if (!path) return;
  await invoke("export_text", { path, content });
}

// ── MLT ──

export async function listMltFiles(dir: string): Promise<string[]> {
  return await invoke<string[]>("list_mlt_files", { dir });
}

export async function readMltFile(path: string): Promise<string> {
  return await invoke<string>("read_mlt_file", { path });
}
