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
import { ManualModal } from "./components/modals/ManualModal";
import { useProjectStore } from "./stores/projectStore";
import { initSpaceWidths } from "./lib/compositor";
import { useDragHandler } from "./hooks/useDragHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useConfigStore } from "./stores/configStore";
import { t } from "./i18n";
import {
  saveProjectDialog,
  saveProjectToPath,
  openProjectDialog,
  loadConfig,
  saveConfig,
} from "./lib/fileIO";
import type { ProjectFile } from "./types/project";
import { setStatus, setProjectPath, markSaved } from "./stores/projectStore";
import { mergeSelectedLayers } from "./lib/layerOps";
import { usePaletteStore } from "./stores/paletteStore";
import { useMltStore } from "./stores/mltStore";
import { useAutoSave } from "./hooks/useAutoSave";


function App() {
  const project = useProjectStore((s) => s.project);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const previewMode = useConfigStore((s) => s.config.previewMode);

  useDragHandler();
  useKeyboardShortcuts();
  useAutoSave();

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    useProjectStore.getState().saveCurrentDocState();
    const proj = useProjectStore.getState().project;

    const curPath = useProjectStore.getState().projectPath;
    if (curPath) {
      try {
        await saveProjectToPath(curPath, proj);
        await saveRecentProject(curPath);
        setStatus(`${t("status.saved")}: ${curPath}`); markSaved();
      } catch {
        downloadJson(proj, `${proj.name}.aaproj`);
      }
    } else {
      try {
        const path = await saveProjectDialog(proj);
        if (path) {
          await saveRecentProject(path);
          setStatus(`${t("status.saved")}: ${path}`);
          markSaved();
          setProjectPath(path);
        }
      } catch {
        downloadJson(proj, `${proj.name}.aaproj`);
        setStatus(t("status.projectDownloaded"));
      }
    }
  }, []);

  const handleSaveAs = useCallback(async () => {
    useProjectStore.getState().saveCurrentDocState();
    const proj = useProjectStore.getState().project;
    setProjectPath(null);
    try {
      const path = await saveProjectDialog(proj);
      if (path) {
        await saveRecentProject(path);
        setStatus(`${t("status.saved")}: ${path}`);
        markSaved();
        setProjectPath(path);
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
      setStatus(`${t("status.loaded")}: ${result.path}`);
      setProjectPath(result.path);
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
        setProjectPath(null);
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
      if (mod && e.key === "w") {
        e.preventDefault();
        const store = useProjectStore.getState();
        if (store.project.documents.length > 1) {
          store.closeDocument(store.project.activeDocId);
          setStatus(t("status.docClosed"));
        }
      }
      if (mod && e.shiftKey && e.key === "t") {
        e.preventDefault();
        const store = useProjectStore.getState();
        if (store.closedDocStack.length > 0) {
          store.reopenLastClosedDocument();
          setStatus(t("status.docReopened"));
        }
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        const store = useProjectStore.getState();
        store.saveCurrentDocState();
        const doc = store.createDocument();
        useProjectStore.setState({
          project: { ...useProjectStore.getState().project, activeDocId: doc.id },
        });
        store.restoreDocState();
        setStatus(`${t("status.newDoc")}: ${doc.name}`);
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

      // 윈도우 레이아웃 복원
      await restoreWindowLayout();

      // 팔레트세트 로드
      await usePaletteStore.getState().initFromStorage();
      const cfg = useConfigStore.getState().config;
      if (cfg.activePaletteIndex > 0) {
        usePaletteStore.getState().setActivePaletteIndex(cfg.activePaletteIndex);
      }

      // MLT 디렉토리 복원
      await useMltStore.getState().initFromStorage();
      // MLT 파일/섹션 인덱스 복원
      if (cfg.mltFileIndex > 0 && useMltStore.getState().files.length > cfg.mltFileIndex) {
        const { invoke } = await import("@tauri-apps/api/core").catch(() => ({ invoke: null }));
        if (invoke) {
          const f = useMltStore.getState().files[cfg.mltFileIndex];
          try {
            const content = await invoke<string>("read_mlt_file", { path: f.path });
            useMltStore.getState().loadFileContent(cfg.mltFileIndex, content);
          } catch {}
        }
      }
      if (cfg.mltSectionIndex > 0) {
        const sections = useMltStore.getState().sections;
        if (sections.length > cfg.mltSectionIndex) {
          useMltStore.getState().setCurrentSection(cfg.mltSectionIndex);
        }
      }

      // 최근 프로젝트 복원 시도
      const restored = await tryRestoreLastProject();
      if (restored) return;

      // 새 프로젝트 생성 (폴백)
      createNewProject();
    }
    init();
  }, []);

  // 패널 레이아웃 복원 (DOM 렌더 후)
  useEffect(() => {
    if (project.documents.length === 0) return;
    const layout = useConfigStore.getState().config.panelLayout;
    if (!layout) return;
    if (leftPanelRef.current && layout.leftPanelWidth > 0) {
      leftPanelRef.current.style.width = layout.leftPanelWidth + "px";
    }
    if (previewPanelRef.current && layout.previewPanelWidth > 0) {
      previewPanelRef.current.style.width = layout.previewPanelWidth + "px";
    }
  }, [project.documents.length > 0]);

  // 윈도우/패널 레이아웃 변경 시 디바운스 저장
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const saveLayout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const panelLayout = {
          leftPanelWidth: leftPanelRef.current?.offsetWidth ?? 0,
          previewPanelWidth: previewPanelRef.current?.offsetWidth ?? 0,
        };
        useConfigStore.getState().updateConfig({ panelLayout });
        saveWindowLayout();
      }, 500);
    };
    window.addEventListener("resize", saveLayout);
    // 패널 리사이즈는 mouseup 시 감지
    document.addEventListener("mouseup", saveLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", saveLayout);
      document.removeEventListener("mouseup", saveLayout);
    };
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
        onOpen={handleOpen}
        onMerge={mergeSelectedLayers}
        onOpenManual={() => setManualOpen(true)}
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
      <ManualModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
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

    setProjectPath(path);
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

/** 윈도우 위치/크기 복원 */
async function restoreWindowLayout() {
  const layout = useConfigStore.getState().config.windowLayout;
  if (!layout) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const { PhysicalPosition, PhysicalSize } = await import("@tauri-apps/api/dpi");
    const win = getCurrentWindow();
    await win.setSize(new PhysicalSize(layout.width, layout.height));
    await win.setPosition(new PhysicalPosition(layout.x, layout.y));
  } catch {}
}

/** 윈도우 위치/크기 저장 */
async function saveWindowLayout() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    useConfigStore.getState().updateConfig({
      windowLayout: {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
      },
    });
  } catch {}
}

export default App;
