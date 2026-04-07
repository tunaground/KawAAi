import { useState, useRef, useEffect } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { useMltStore } from "../../stores/mltStore";
import { useProjectStore } from "../../stores/projectStore";
import { setStatus } from "../../stores/projectStore";
import { getMeasureCtx, LAYER_PADDING, LINE_HEIGHT } from "../../lib/fontMetrics";
import { useI18n } from "../../i18n";
import styles from "./MltSection.module.css";

export function MltSection() {
  const t = useI18n((s) => s.t);
  const files = useMltStore((s) => s.files);
  const currentFileIndex = useMltStore((s) => s.currentFileIndex);
  const entries = useMltStore((s) => s.entries);
  const sections = useMltStore((s) => s.sections);
  const currentSectionIndex = useMltStore((s) => s.currentSectionIndex);
  const setFiles = useMltStore((s) => s.setFiles);
  const loadFileContent = useMltStore((s) => s.loadFileContent);
  const setCurrentSection = useMltStore((s) => s.setCurrentSection);
  const loadDir = useMltStore((s) => s.loadDir);
  const dirPath = useMltStore((s) => s.dirPath);

  const createLayer = useProjectStore((s) => s.createLayer);
  const layerCount = useProjectStore((s) => s.layers.length);

  const [hoverPreview, setHoverPreview] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleSelectDir = async () => {
    // Tauri 환경: plugin-dialog로 디렉토리 선택
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, title: t("mlt.selectDir") });
      if (!dir) return;
      await loadDir(dir as string);
      const count = useMltStore.getState().files.length;
      if (count === 0) { setStatus(t("mlt.noFiles")); return; }
      setStatus(`${t("mlt.loaded")}: ${count}${t("mlt.files")}`);
      return;
    } catch {
      // Tauri 미사용 — 브라우저 폴백
    }

    // 브라우저 폴백: showDirectoryPicker
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const mltFiles: { name: string; path: string }[] = [];
        const fileHandles: Map<string, any> = new Map();

        for await (const [name, handle] of dirHandle.entries()) {
          if (handle.kind === "file" && name.toLowerCase().endsWith(".mlt")) {
            mltFiles.push({ name, path: name });
            fileHandles.set(name, handle);
          }
        }
        mltFiles.sort((a, b) => a.name.localeCompare(b.name));

        if (mltFiles.length === 0) { setStatus(t("mlt.noFiles")); return; }

        (window as any).__mltFileHandles = fileHandles;
        setFiles(mltFiles);

        const firstHandle = fileHandles.get(mltFiles[0].name);
        const file = await firstHandle.getFile();
        const content = await file.text();
        loadFileContent(0, content);
        setStatus(`${t("mlt.loaded")}: ${mltFiles.length}${t("mlt.files")}`);
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    } else {
      setStatus(t("mlt.dirNotSupported"));
    }
  };

  const loadMltByIndex = async (index: number) => {
    const targetFiles = useMltStore.getState().files;
    const f = targetFiles[index];
    if (!f) return;

    // Tauri
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const content = await invoke<string>("read_mlt_file", { path: f.path });
      loadFileContent(index, content);
      return;
    } catch {}

    // 브라우저 폴백
    const handles = (window as any).__mltFileHandles as Map<string, any> | undefined;
    if (handles) {
      try {
        const handle = handles.get(f.name);
        if (handle) {
          const file = await handle.getFile();
          const content = await file.text();
          loadFileContent(index, content);
        }
      } catch {}
    }
  };

  const handleRefresh = async () => {
    const dir = useMltStore.getState().dirPath;
    if (!dir) return;
    await loadDir(dir);
    const count = useMltStore.getState().files.length;
    setStatus(`${t("mlt.refreshed")}: ${count}${t("mlt.files")}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await loadMltByIndex(Number(e.target.value));
  };

  const insertEntry = (entry: { name: string; text: string }) => {
    const ctx = getMeasureCtx();
    const lines = entry.text.split("\n");
    let maxW = 0;
    lines.forEach((l) => { maxW = Math.max(maxW, ctx.measureText(l).width); });
    // 측정 오차 + 스냅 올림을 고려해서 여유를 줌
    const w = Math.ceil(maxW) + LAYER_PADDING * 2 + 2;
    const h = lines.length * LINE_HEIGHT + LAYER_PADDING * 2 + 2;
    const offset = layerCount * 20;
    const layer = createLayer(entry.text, 20 + offset, 20 + offset, w, h);
    layer.name = entry.name || "MLT";
    setStatus(`"${layer.name}" ${t("layer.insertedFromMlt")}`);
  };

  const sec = sections[currentSectionIndex];
  const visibleEntries = sec ? entries.slice(sec.startIdx, sec.endIdx) : [];

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={currentFileIndex}
          onChange={handleFileSelect}
          disabled={files.length === 0}
        >
          {files.length === 0 ? (
            <option>{t("mlt.selectDirPlaceholder")}</option>
          ) : (
            files.map((f, i) => (
              <option key={i} value={i}>{f.name}</option>
            ))
          )}
        </select>
        {dirPath && (
          <div className={styles.menuBtn} onClick={handleRefresh} title={t("mlt.refresh")}>
            <RefreshCw size={12} />
          </div>
        )}
        <div className={styles.menuBtn} onClick={handleSelectDir} title={t("mlt.selectDir")}>
          <FolderOpen size={14} />
        </div>
      </div>

      {sections.length > 1 && (
        <div className={styles.toolbar}>
          <select
            className={styles.select}
            value={currentSectionIndex}
            onChange={(e) => setCurrentSection(Number(e.target.value))}
          >
            {sections.map((s, i) => (
              <option key={i} value={i}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.list}>
        {visibleEntries.length === 0 ? (
          <div className={styles.empty}>{t("mlt.loadEmpty")}</div>
        ) : (
          visibleEntries.map((entry, i) => (
            <div
              key={sec!.startIdx + i}
              className={styles.item}
              onClick={() => insertEntry(entry)}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setHoverPreview({
                  text: entry.text,
                  x: rect.right + 8,
                  y: rect.top,
                });
              }}
              onMouseLeave={() => setHoverPreview(null)}
            >
              <div className={styles.preview}>
                {entry.text.split("\n").slice(0, 3).join("\n")}
              </div>
              <div className={styles.name}>{entry.name || `#${sec!.startIdx + i + 1}`}</div>
            </div>
          ))
        )}
      </div>

      {hoverPreview && (
        <HoverPopup
          text={hoverPreview.text}
          x={hoverPreview.x}
          y={hoverPreview.y}
        />
      )}
    </div>
  );
}

function HoverPopup({ text, x, y }: { text: string; x: number; y: number }) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(y);

  useEffect(() => {
    const el = popupRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    const maxY = window.innerHeight - h - 8;
    setTop(Math.max(8, Math.min(y, maxY)));
  }, [y, text]);

  return (
    <div ref={popupRef} className={styles.hoverPreview} style={{ left: x, top }}>
      {text}
    </div>
  );
}
