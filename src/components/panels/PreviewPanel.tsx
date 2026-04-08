import { useEffect, useState, useRef, forwardRef } from "react";
import {
  Copy, ChevronsRight, ChevronsLeft, ChevronsDown, ChevronsUp,
  Download, PanelBottom, PanelRight, ExternalLink, X,
  Minus, Plus,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useConfigStore } from "../../stores/configStore";
import { compositeLayers } from "../../lib/compositor";
import { useI18n } from "../../i18n";
import { setStatus } from "../../stores/projectStore";
import styles from "./PreviewPanel.module.css";

// 별도 창 참조
let detachedWindow: any = null;

export const PreviewPanel = forwardRef<HTMLDivElement>(function PreviewPanel(_props, ref) {
  const layers = useProjectStore((s) => s.layers);
  const activeDocName = useProjectStore((s) => {
    const doc = s.project.documents.find(d => d.id === s.project.activeDocId);
    return doc?.name ?? "export";
  });
  const docFontSize = useProjectStore((s) => s.fontSize);
  const docLineHeight = useProjectStore((s) => s.lineHeight);
  const t = useI18n((s) => s.t);
  const previewMode = useConfigStore((s) => s.config.previewMode);
  const setPreviewMode = useConfigStore((s) => s.setPreviewMode);
  const previewFontSize = useConfigStore((s) => s.config.previewFontSize);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const [compositeText, setCompositeText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const compositeRef = useRef("");

  const isBottom = previewMode === "bottom";
  const isDetached = previewMode === "detached";

  useEffect(() => {
    const timer = setTimeout(() => {
      const lines = compositeLayers(layers, docFontSize, docLineHeight);
      const text = lines.join("\n");
      setCompositeText(text);
      compositeRef.current = text;

      if (isDetached && detachedWindow) {
        emitToPreview(text);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [layers, isDetached, docFontSize, docLineHeight]);

  const handleCopy = () => {
    navigator.clipboard.writeText(compositeText);
    setStatus(t("preview.copied"));
  };

  const handleExport = async () => {
    const docName = activeDocName;
    const filename = `${docName}.txt`;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await save({
        defaultPath: filename,
        filters: [{ name: "Text", extensions: ["txt"] }],
      });
      if (!path) return;
      await invoke("export_text", { path, content: compositeText });
      setStatus(`${t("status.textExported")}: ${path}`);
      return;
    } catch {}

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "Text", accept: { "text/plain": [".txt"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(compositeText);
        await writable.close();
        setStatus(`${t("status.textExported")}: ${handle.name}`);
        return;
      } catch (e: any) {
        if (e.name === "AbortError") return;
      }
    }

    const blob = new Blob([compositeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(t("status.textDownloaded"));
  };

  const togglePosition = () => {
    setPreviewMode(isBottom ? "right" : "bottom");
  };

  const fontSize = previewFontSize ?? 16;
  const setFontSize = (size: number) => {
    const clamped = Math.max(1, Math.min(48, size));
    updateConfig({ previewFontSize: clamped });
  };

  const handleFontSizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setFontSize(val);
  };

  const handleDetach = async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      detachedWindow = new WebviewWindow("preview", {
        url: "/preview.html",
        title: "KawAAi — 합성 결과",
        width: 500,
        height: 600,
      });

      // 창이 열리면 현재 텍스트 전송
      detachedWindow.once("tauri://created", () => {
        setTimeout(() => emitToPreview(compositeRef.current), 500);
        setStatus(t("status.detachedOpen"));
      });

      // 창 닫힘 감지 → right 모드로 복귀
      detachedWindow.once("tauri://destroyed", () => {
        detachedWindow = null;
        setPreviewMode("right");
        setStatus(t("status.detachedClosed"));
      });

      setPreviewMode("detached");
    } catch {
      setStatus(t("status.detachedNotSupported"));
    }
  };

  const handleAttach = () => {
    if (detachedWindow) {
      try { detachedWindow.close(); } catch {}
      detachedWindow = null;
    }
    setPreviewMode("right");
  };

  // detached 모드면 패널 접기 상태로 표시 + attach 버튼만
  if (isDetached) {
    return (
      <div ref={ref} className={`${styles.panel} ${styles.collapsed}`}>
        <div className={styles.header}>
          <div className={styles.headerBtns}>
            <button
              className={`${styles.headerBtn} ${styles.expandBtn}`}
              onClick={handleAttach}
              title="우측으로 복귀"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const CollapseIcon = isBottom
    ? (collapsed ? ChevronsUp : ChevronsDown)
    : (collapsed ? ChevronsLeft : ChevronsRight);

  return (
    <div
      ref={ref}
      className={`${styles.panel} ${isBottom ? styles.bottom : ""} ${collapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.header}>
        <span>{t("preview.title")}</span>
        <div className={styles.fontSizeControl}>
          <button className={styles.fontSizeBtn} onClick={() => setFontSize(fontSize - 1)} title="-1px">
            <Minus size={10} />
          </button>
          <input
            className={styles.fontSizeInput}
            type="number"
            value={fontSize}
            onChange={handleFontSizeInput}
            min={1}
            max={48}
          />
          <span className={styles.fontSizeUnit}>px</span>
          <button className={styles.fontSizeBtn} onClick={() => setFontSize(fontSize + 1)} title="+1px">
            <Plus size={10} />
          </button>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.headerBtn} onClick={handleCopy} title={t("preview.copy")}>
            <Copy size={12} />
          </button>
          <button className={styles.headerBtn} onClick={handleExport} title="Export .txt">
            <Download size={12} />
          </button>
          <button className={styles.headerBtn} onClick={togglePosition} title={isBottom ? "▶ 우측" : "▼ 하단"}>
            {isBottom ? <PanelRight size={12} /> : <PanelBottom size={12} />}
          </button>
          <button className={styles.headerBtn} onClick={handleDetach} title="별도 창으로">
            <ExternalLink size={12} />
          </button>
          <button
            className={`${styles.headerBtn} ${styles.expandBtn}`}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? t("preview.expand") : t("preview.collapse")}
          >
            <CollapseIcon size={12} />
          </button>
        </div>
      </div>
      <div className={styles.content}>
        <textarea
          className={styles.textarea}
          value={compositeText}
          readOnly
          style={{ fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * (docLineHeight / docFontSize))}px` }}
        />
      </div>
    </div>
  );
});

/** 별도 창에 합성 결과 전송 */
async function emitToPreview(text: string) {
  try {
    const { emitTo } = await import("@tauri-apps/api/event");
    await emitTo("preview", "preview-update", text);
  } catch {}
}
