import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { usePaletteStore } from "../../stores/paletteStore";
import { useProjectStore } from "../../stores/projectStore";
import { saveUndoSnapshot } from "../../stores/projectStore";
import { setStatus } from "../../stores/projectStore";
import { showInputModal, showConfirmModal } from "../modals/InputModal";
import { useI18n } from "../../i18n";
import styles from "./PaletteSection.module.css";

export function PaletteSection() {
  const t = useI18n((s) => s.t);
  const paletteSet = usePaletteStore((s) => s.paletteSet);
  const activePaletteIndex = usePaletteStore((s) => s.activePaletteIndex);
  const setActivePaletteIndex = usePaletteStore((s) => s.setActivePaletteIndex);
  const addChar = usePaletteStore((s) => s.addChar);
  const removeChar = usePaletteStore((s) => s.removeChar);
  const addPalette = usePaletteStore((s) => s.addPalette);
  const setPaletteSet = usePaletteStore((s) => s.setPaletteSet);
  const removePalette = usePaletteStore((s) => s.removePalette);

  const updateLayer = useProjectStore((s) => s.updateLayer);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });

  const palette = paletteSet.palettes[activePaletteIndex];

  // 메뉴 바깥 클릭 닫기 — mouseup 사용 (mousedown이면 메뉴 item의 onClick보다 먼저 발생)
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuBtnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, [menuOpen]);

  const insertChar = (ch: string) => {
    const { activeLayerId, layers } = useProjectStore.getState();
    if (activeLayerId === null) { setStatus(t("palette.noActiveLayer")); return; }
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.type !== "text") return;
    saveUndoSnapshot();

    // 활성 textarea의 커서 위치에 삽입
    const ta = document.querySelector(`textarea:focus`) as HTMLTextAreaElement | null;
    if (ta && ta.selectionStart != null) {
      const pos = ta.selectionStart;
      const newText = layer.text.slice(0, pos) + ch + layer.text.slice(pos);
      updateLayer(layer.id, { text: newText });
      // 커서를 삽입 문자 뒤로 이동
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos + ch.length;
      });
    } else {
      updateLayer(layer.id, { text: layer.text + ch });
    }
    setStatus(`"${ch}" ${t("palette.charInserted")}`);
  };

  const handleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ left: rect.right + 4, top: rect.top });
    setMenuOpen(!menuOpen);
  };

  const menuAction = async (action: string) => {
    setMenuOpen(false);
    const set = paletteSet;
    const pal = set.palettes[activePaletteIndex];

    switch (action) {
      case "addChar": {
        const ch = await showInputModal(t("palette.charPrompt"));
        if (ch && [...ch].length >= 1) {
          addChar([...ch][0]);
          setStatus(`"${[...ch][0]}" ${t("palette.charAdded")}`);
        }
        break;
      }
      case "addPalette": {
        const name = await showInputModal(t("palette.namePrompt"));
        if (name) {
          addPalette(name);
          setStatus(`"${name}" ${t("palette.added")}`);
        }
        break;
      }
      case "removePalette": {
        if (!pal) break;
        if (set.palettes.length <= 1) { setStatus(t("status.lastPalette")); break; }
        const ok = await showConfirmModal(
          `"${pal.name}" ${t("palette.deleteConfirm")}`,
          t("modal.delete"),
          "danger"
        );
        if (ok) {
          removePalette(activePaletteIndex);
          setStatus(`"${pal.name}" ${t("palette.deleted")}`);
        }
        break;
      }
      case "exportPalette": {
        if (!pal) break;
        const json = JSON.stringify({ name: pal.name, chars: pal.chars }, null, 2);
        const palPath = await saveFileWithDialog(json, `${pal.name}.aapal`);
        if (palPath) setStatus(`${t("palette.exported")}: ${palPath}`);
        break;
      }
      case "importPalette": {
        const data = await pickJsonFile(".aapal");
        if (data && data.name && Array.isArray(data.chars)) {
          const palettes = [...set.palettes, { name: data.name, chars: data.chars }];
          setPaletteSet({ ...set, palettes });
          usePaletteStore.getState().setActivePaletteIndex(palettes.length - 1);
          setStatus(`"${data.name}" ${t("palette.imported")}`);
        }
        break;
      }
      case "exportSet": {
        const json = JSON.stringify(set, null, 2);
        const setPath = await saveFileWithDialog(json, `${set.name}.aapals`);
        if (setPath) setStatus(`${t("palette.setExported")}: ${setPath}`);
        break;
      }
      case "importSet": {
        const data = await pickJsonFile(".aapals");
        if (data && data.name && Array.isArray(data.palettes)) {
          setPaletteSet(data as any);
          setStatus(`"${data.name}" ${t("palette.setImported")}`);
        }
        break;
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={activePaletteIndex}
          onChange={(e) => setActivePaletteIndex(Number(e.target.value))}
        >
          {paletteSet.palettes.map((p, i) => (
            <option key={i} value={i}>{p.name}</option>
          ))}
        </select>
        <div className={styles.menuBtn} ref={menuBtnRef} onMouseDown={handleMenu}>
          <MoreVertical size={14} />
        </div>
      </div>

      <div className={styles.grid}>
        {palette?.chars.map((ch, i) => (
          <div
            key={i}
            className={styles.charBtn}
            title={`U+${ch.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`}
            onMouseDown={(e) => { e.preventDefault(); insertChar(ch); }}
            onContextMenu={async (e) => {
              e.preventDefault();
              const ok = await showConfirmModal(
                `"${ch}" ${t("palette.deleteConfirm")}`,
                t("modal.delete"),
                "danger"
              );
              if (ok) {
                removeChar(i);
                setStatus(`"${ch}" ${t("palette.charDeleted")}`);
              }
            }}
          >
            {ch}
          </div>
        ))}
        {(!palette || palette.chars.length === 0) && (
          <div className={styles.empty}>{t("palette.addChar")}</div>
        )}
      </div>

      {menuOpen && (
        <div ref={menuRef} className={styles.menu} style={{ left: menuPos.left, top: menuPos.top }}>
          <div className={styles.menuItem} onClick={() => menuAction("addChar")}>{t("palette.addChar")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("addPalette")}>{t("palette.addPalette")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("removePalette")} style={{ color: "#f44" }}>{t("palette.deletePalette")}</div>
          <div className={styles.menuSep} />
          <div className={styles.menuItem} onClick={() => menuAction("importPalette")}>{t("palette.importPalette")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("exportPalette")}>{t("palette.exportPalette")}</div>
          <div className={styles.menuSep} />
          <div className={styles.menuItem} onClick={() => menuAction("importSet")}>{t("palette.importSet")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("exportSet")}>{t("palette.exportSet")}</div>
        </div>
      )}
    </div>
  );
}

/** 저장 다이얼로그로 파일 저장. 경로 선택 가능. */
async function saveFileWithDialog(content: string, filename: string) {
  // Tauri 환경
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const ext = filename.split(".").pop() ?? "json";
    const path = await save({
      defaultPath: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (!path) return null;
    await invoke("save_json_file", { path, data: JSON.parse(content) });
    return path;
  } catch {
    // 브라우저 폴백: showSaveFilePicker 또는 다운로드
  }

  // showSaveFilePicker (Chrome 등)
  if ("showSaveFilePicker" in window) {
    try {
      const ext = filename.split(".").pop() ?? "json";
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: ext.toUpperCase(), accept: { "application/json": [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return handle.name;
    } catch (e: any) {
      if (e.name === "AbortError") return null;
    }
  }

  // 최종 폴백: 다운로드
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}

/** 파일 선택 → JSON 파싱 */
function pickJsonFile(accept: string): Promise<any | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
