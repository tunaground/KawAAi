import { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "./components/layout/Header";
import { TabBar } from "./components/layout/TabBar";
import { StatusBar } from "./components/layout/StatusBar";
import { LeftPanel } from "./components/panels/LeftPanel";
import { PreviewPanel } from "./components/panels/PreviewPanel";
import { PanelResize } from "./components/panels/PanelResize";
import { Canvas } from "./components/canvas/Canvas";
import { InputModal } from "./components/modals/InputModal";
import { QuickEditModal } from "./components/modals/QuickEditModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { useProjectStore } from "./stores/projectStore";
import { initSpaceWidths } from "./lib/compositor";
import { useDragHandler } from "./hooks/useDragHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useConfigStore } from "./stores/configStore";
import { useI18n } from "./i18n";
import {
  saveProjectDialog,
  saveProjectToPath,
  openProjectDialog,
  loadConfig,
  saveConfig,
} from "./lib/fileIO";
import type { ProjectFile } from "./types/project";
import { setStatus } from "./stores/statusStore";
import { mergeSelectedLayers } from "./lib/layerOps";
import { usePaletteStore } from "./stores/paletteStore";
import { useMltStore } from "./stores/mltStore";

// 현재 열려 있는 프로젝트 파일 경로
let currentProjectPath: string | null = null;

function App() {
  const project = useProjectStore((s) => s.project);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const previewMode = useConfigStore((s) => s.config.previewMode);

  useDragHandler();
  useKeyboardShortcuts();

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    useProjectStore.getState().saveCurrentDocState();
    const proj = useProjectStore.getState().project;

    if (currentProjectPath) {
      try {
        await saveProjectToPath(currentProjectPath, proj);
        await saveRecentProject(currentProjectPath);
        setStatus(`저장됨: ${currentProjectPath}`);
      } catch {
        downloadJson(proj, `${proj.name}.aaproj`);
      }
    } else {
      try {
        const path = await saveProjectDialog(proj);
        if (path) {
          currentProjectPath = path;
          await saveRecentProject(path);
          setStatus(`저장됨: ${path}`);
        }
      } catch {
        downloadJson(proj, `${proj.name}.aaproj`);
        setStatus("프로젝트 다운로드됨");
      }
    }
  }, []);

  const handleSaveAs = useCallback(async () => {
    useProjectStore.getState().saveCurrentDocState();
    const proj = useProjectStore.getState().project;
    currentProjectPath = null;
    try {
      const path = await saveProjectDialog(proj);
      if (path) {
        currentProjectPath = path;
        await saveRecentProject(path);
        setStatus(`저장됨: ${path}`);
      }
    } catch {
      downloadJson(proj, `${proj.name}.aaproj`);
    }
  }, []);

  // ── 열기 ──
  const handleOpen = useCallback(async () => {
    try {
      const result = await openProjectDialog();
      if (!result) return;
      currentProjectPath = result.path;
      await saveRecentProject(result.path);
      const data = result.data;
      useProjectStore.setState({
        project: data,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: new Set(),
        nextLayerId: 0,
      });
      useProjectStore.getState().restoreDocState();
      setStatus(`불러옴: ${result.path}`);
    } catch {
      // Tauri 미사용 환경: file input 폴백
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".aaproj";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const data = JSON.parse(text);
        currentProjectPath = null;
        useProjectStore.setState({
          project: data,
          layers: [],
          activeLayerId: null,
          selectedLayerIds: new Set(),
          nextLayerId: 0,
        });
        useProjectStore.getState().restoreDocState();
      };
      input.click();
    }
  }, []);

  // ── 키보드 단축키: Ctrl+S, Ctrl+Shift+S, Ctrl+O ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      }
      if (mod && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSave, handleSaveAs, handleOpen]);

  // ── 초기화: 최근 프로젝트 복원 또는 새 프로젝트 생성 ──
  useEffect(() => {
    if (useProjectStore.getState().project.documents.length > 0) return;

    async function init() {
      try {
        await document.fonts.load("16px Saitamaar");
        await new Promise((r) => setTimeout(r, 300));
      } catch {}

      initSpaceWidths();

      // 앱 설정 로드 (언어, 테마 등)
      await useConfigStore.getState().initFromStorage();
      // 저장된 locale을 i18n에 반영
      const savedLocale = useConfigStore.getState().config.locale;
      if (savedLocale && savedLocale !== "system") {
        useI18n.getState().setLocale(savedLocale as "ko" | "ja" | "en");
      }

      // 팔레트세트 로드
      await usePaletteStore.getState().initFromStorage();

      // MLT 디렉토리 복원
      await useMltStore.getState().initFromStorage();

      // 최근 프로젝트 복원 시도
      const restored = await tryRestoreLastProject();
      if (restored) return;

      // 새 프로젝트 생성 (폴백)
      createNewProject();
    }
    init();
  }, []);

  if (project.documents.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Header
        onOpenQuickEdit={() => setQuickEditOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onOpen={handleOpen}
        onMerge={mergeSelectedLayers}
      />
      <TabBar />
      {previewMode === "bottom" ? (
        /* 하단 모드: 세로 분할 */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <LeftPanel ref={leftPanelRef} />
            <PanelResize side="left" targetRef={leftPanelRef} />
            <Canvas />
          </div>
          <PreviewPanel ref={previewPanelRef} />
        </div>
      ) : (
        /* 우측 모드 (기본) */
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <LeftPanel ref={leftPanelRef} />
          <PanelResize side="left" targetRef={leftPanelRef} />
          <Canvas />
          <PanelResize side="right" targetRef={previewPanelRef} />
          <PreviewPanel ref={previewPanelRef} />
        </div>
      )}
      <StatusBar />

      <InputModal />
      <QuickEditModal
        open={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

/** 최근 프로젝트 경로를 config에 저장 */
async function saveRecentProject(path: string) {
  try {
    const config = await loadConfig();
    const recent = config?.recentProjects ?? [];
    // 중복 제거 후 맨 앞에 추가
    const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 10);
    await saveConfig({ ...(config ?? {}), recentProjects: updated } as any);
  } catch {
    // Tauri 없는 환경: localStorage 폴백
    const recent = JSON.parse(localStorage.getItem("recentProjects") ?? "[]");
    const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 10);
    localStorage.setItem("recentProjects", JSON.stringify(updated));
  }
}

/** 최근 프로젝트 경로 가져오기 */
async function getLastProjectPath(): Promise<string | null> {
  try {
    const config = await loadConfig();
    return config?.recentProjects?.[0] ?? null;
  } catch {
    const recent = JSON.parse(localStorage.getItem("recentProjects") ?? "[]");
    return recent[0] ?? null;
  }
}

/** 최근 프로젝트 복원 시도 */
async function tryRestoreLastProject(): Promise<boolean> {
  const path = await getLastProjectPath();
  if (!path) return false;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<ProjectFile>("load_project", { path });
    if (!data || !data.documents || data.documents.length === 0) return false;

    currentProjectPath = path;
    useProjectStore.setState({
      project: data,
      layers: [],
      activeLayerId: null,
      selectedLayerIds: new Set(),
      nextLayerId: 0,
    });
    useProjectStore.getState().restoreDocState();
    return true;
  } catch {
    return false;
  }
}

/** 새 프로젝트 생성 (초기화 시 폴백) */
function createNewProject() {
  const store = useProjectStore.getState();
  const doc = store.createDocument("문서 1");
  useProjectStore.setState({
    project: { ...useProjectStore.getState().project, activeDocId: doc.id },
  });
  store.restoreDocState();

  store.createLayer(
    "　 ∧＿∧\n　（　´∀｀）\n　（　　　）\n　｜ ｜　|\n　（＿_）＿）",
    30, 30, 180, 110
  );
  store.createLayer(
    "／￣￣￣￣￣￣￣￣\n＜　やるおだお！\n＼＿＿＿＿＿＿＿＿",
    200, 20, 220, 76
  );

  store.saveCurrentDocState();
}

/** Tauri 없을 때 폴백: JSON 다운로드 */
function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default App;
