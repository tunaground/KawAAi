import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { usePaletteStore } from "../../stores/paletteStore";
import { useProjectStore } from "../../stores/projectStore";
import { saveUndoSnapshot, setStatus } from "../../stores/projectStore";
import { showInputModal, showConfirmModal } from "../modals/InputModal";
import { showBoxInputModal } from "../modals/BoxInputModal";
import { showStampInputModal } from "../modals/StampInputModal";
import { useConfigStore } from "../../stores/configStore";
import { useI18n } from "../../i18n";
import { measureCharWidth, measureString } from "../../lib/fontMetrics";
import { getDotString } from "../../lib/dotInput";
import type { BoxPreset } from "../../types/palette";
import styles from "./PaletteSection.module.css";

const BOX_PREVIEW_FONT_SIZE = 10;

export function PaletteSection() {
  const t = useI18n((s) => s.t);
  const paletteSet = usePaletteStore((s) => s.paletteSet);
  const activePaletteIndex = usePaletteStore((s) => s.activePaletteIndex);
  const setActivePaletteIndex = usePaletteStore((s) => s.setActivePaletteIndex);
  const addChar = usePaletteStore((s) => s.addChar);
  const removeChar = usePaletteStore((s) => s.removeChar);
  const addBox = usePaletteStore((s) => s.addBox);
  const updateBox = usePaletteStore((s) => s.updateBox);
  const removeBox = usePaletteStore((s) => s.removeBox);
  const addPalette = usePaletteStore((s) => s.addPalette);
  const setPaletteSet = usePaletteStore((s) => s.setPaletteSet);
  const removePalette = usePaletteStore((s) => s.removePalette);

  const addStamp = usePaletteStore((s) => s.addStamp);
  const updateStamp = usePaletteStore((s) => s.updateStamp);
  const removeStamp = usePaletteStore((s) => s.removeStamp);

  const updateLayer = useProjectStore((s) => s.updateLayer);
  const activeBoxPreset = useProjectStore((s) => s.activeBoxPreset);
  const setActiveBoxPreset = useProjectStore((s) => s.setActiveBoxPreset);
  const activeStampPreset = useProjectStore((s) => s.activeStampPreset);
  const setActiveStampPreset = useProjectStore((s) => s.setActiveStampPreset);

  const selectedIndices = usePaletteStore((s) => s.selectedIndices);
  const setSelectedIndices = usePaletteStore((s) => s.setSelectedIndices);
  const clearSelection = usePaletteStore((s) => s.clearSelection);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });

  const palette = paletteSet.palettes[activePaletteIndex];
  const isChar = palette?.type === "char";
  const isBox = palette?.type === "box";
  const isStamp = palette?.type === "stamp";

  useEffect(() => {
    clearSelection();
    setActiveBoxPreset(null);
    setActiveStampPreset(null);
  }, [activePaletteIndex]);

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

  // ── 공통 선택 핸들러 ──
  const handleItemClick = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const mod = e.ctrlKey || e.metaKey;
    if (mod) {
      if (isBox) setActiveBoxPreset(null);
      if (isStamp) setActiveStampPreset(null);
      const next = new Set(selectedIndices);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      setSelectedIndices(next);
    } else if (e.shiftKey && selectedIndices.size > 0) {
      if (isBox) setActiveBoxPreset(null);
      if (isStamp) setActiveStampPreset(null);
      const last = [...selectedIndices].pop()!;
      const from = Math.min(last, idx);
      const to = Math.max(last, idx);
      const next = new Set(selectedIndices);
      for (let i = from; i <= to; i++) next.add(i);
      setSelectedIndices(next);
    } else {
      setSelectedIndices(new Set([idx]));
      // 박스: 단일 클릭 시 활성화
      if (isBox && palette.type === "box") {
        const box = palette.boxes[idx];
        setActiveBoxPreset(activeBoxPreset === box ? null : box);
      }
      // 스탬프: 단일 클릭 시 활성화
      if (isStamp && palette.type === "stamp") {
        const stamp = palette.stamps[idx];
        setActiveStampPreset(activeStampPreset === stamp ? null : stamp);
      }
    }
  };

  // ── char: 더블클릭 삽입 ──
  const insertChar = (ch: string) => {
    const { activeLayerId, layers } = useProjectStore.getState();
    if (activeLayerId === null) { setStatus(t("palette.noActiveLayer")); return; }
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.type !== "text") return;
    saveUndoSnapshot();
    const ta = document.querySelector(`textarea:focus`) as HTMLTextAreaElement | null;
    if (ta && ta.selectionStart != null) {
      const pos = ta.selectionStart;
      const newText = layer.text.slice(0, pos) + ch + layer.text.slice(pos);
      updateLayer(layer.id, { text: newText });
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos + ch.length; });
    } else {
      updateLayer(layer.id, { text: layer.text + ch });
    }
    setStatus(`"${ch}" ${t("palette.charInserted")}`);
  };

  // ── 메뉴 ──
  const handleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ left: rect.right + 4, top: rect.top });
    setMenuOpen(!menuOpen);
  };

  const menuAction = async (action: string) => {
    setMenuOpen(false);
    const set = paletteSet;

    switch (action) {
      // char actions
      case "addChar": {
        const ch = await showInputModal(t("palette.charPrompt"));
        if (ch) {
          const chars = [...ch];
          for (const c of chars) addChar(c);
          setStatus(chars.length === 1 ? `"${chars[0]}" ${t("palette.charAdded")}` : `${chars.length}${t("palette.charsAdded")}`);
        }
        break;
      }
      case "removeSelectedChars": {
        if (selectedIndices.size === 0) break;
        const ok = await showConfirmModal(`${selectedIndices.size}${t("palette.deleteSelectedConfirm")}`, t("modal.delete"), "danger");
        if (ok) {
          const sorted = [...selectedIndices].sort((a, b) => b - a);
          for (const idx of sorted) removeChar(idx);
          setSelectedIndices(new Set());
          setStatus(`${sorted.length}${t("palette.charsDeleted")}`);
        }
        break;
      }
      // box actions
      case "addBox": {
        const preset = await showBoxInputModal();
        if (preset) { addBox(preset); setStatus(t("box.added")); }
        break;
      }
      case "editBox": {
        if (selectedIndices.size !== 1 || !isBox) break;
        const idx = [...selectedIndices][0];
        const result = await showBoxInputModal(palette.boxes[idx]);
        if (result) updateBox(idx, result);
        break;
      }
      case "removeSelectedBoxes": {
        if (selectedIndices.size === 0 || !isBox) break;
        const ok = await showConfirmModal(`${selectedIndices.size}${t("box.deleteSelectedConfirm")}`, t("modal.delete"), "danger");
        if (ok) {
          const sorted = [...selectedIndices].sort((a, b) => b - a);
          for (const idx of sorted) {
            if (activeBoxPreset === palette.boxes[idx]) setActiveBoxPreset(null);
            removeBox(idx);
          }
          setSelectedIndices(new Set());
          setStatus(`${sorted.length}${t("box.deletedCount")}`);
        }
        break;
      }
      // stamp actions
      case "addStamp": {
        const preset = await showStampInputModal();
        if (preset) { addStamp(preset); setStatus(t("stamp.added")); }
        break;
      }
      case "editStamp": {
        if (selectedIndices.size !== 1 || !isStamp || palette.type !== "stamp") break;
        const idx = [...selectedIndices][0];
        const result = await showStampInputModal(palette.stamps[idx]);
        if (result) updateStamp(idx, result);
        break;
      }
      case "removeSelectedStamps": {
        if (selectedIndices.size === 0 || !isStamp || palette.type !== "stamp") break;
        const ok = await showConfirmModal(`${selectedIndices.size}${t("stamp.deleteSelectedConfirm")}`, t("modal.delete"), "danger");
        if (ok) {
          const sorted = [...selectedIndices].sort((a, b) => b - a);
          for (const idx of sorted) {
            if (activeStampPreset === palette.stamps[idx]) setActiveStampPreset(null);
            removeStamp(idx);
          }
          setSelectedIndices(new Set());
          setStatus(`${sorted.length}${t("stamp.deletedCount")}`);
        }
        break;
      }
      // palette management
      case "addCharPalette": {
        const name = await showInputModal(t("palette.namePrompt"));
        if (name) { addPalette(name, "char"); setStatus(`"${name}" ${t("palette.added")}`); }
        break;
      }
      case "addBoxPalette": {
        const name = await showInputModal(t("palette.namePrompt"));
        if (name) { addPalette(name, "box"); setStatus(`"${name}" ${t("palette.added")}`); }
        break;
      }
      case "addStampPalette": {
        const name = await showInputModal(t("palette.namePrompt"));
        if (name) { addPalette(name, "stamp"); setStatus(`"${name}" ${t("palette.added")}`); }
        break;
      }
      case "removePalette": {
        if (!palette) break;
        if (set.palettes.length <= 1) { setStatus(t("status.lastPalette")); break; }
        const ok = await showConfirmModal(`"${palette.name}" ${t("palette.deleteConfirm")}`, t("modal.delete"), "danger");
        if (ok) { removePalette(activePaletteIndex); setStatus(`"${palette.name}" ${t("palette.deleted")}`); }
        break;
      }
      case "exportPalette": {
        if (!palette) break;
        const json = JSON.stringify(palette, null, 2);
        const palPath = await saveFileWithDialog(json, `${palette.name}.aapal`);
        if (palPath) setStatus(`${t("palette.exported")}: ${palPath}`);
        break;
      }
      case "importPalette": {
        const data = await pickJsonFile(".aapal");
        if (data && data.name) {
          // type이 없으면 char로 간주
          if (!data.type) data.type = "char";
          const palettes = [...set.palettes, data];
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

  // ── 박스 미리보기 ──
  const boxPreview = (p: BoxPreset) => {
    const fs = BOX_PREVIEW_FONT_SIZE;
    const hRepeat = 4;
    const padLAdj = p.paddingLeft > 0 ? p.paddingLeft : 0;
    const padRAdj = p.paddingRight > 0 ? p.paddingRight : 0;
    const padRSub = p.paddingRight < 0 ? -p.paddingRight : 0;
    const padL = padLAdj > 0 ? getDotString(padLAdj - 1) : "";
    const padR = padRAdj > 0 ? getDotString(padRAdj - 1) : "";
    const cornerPad = p.paddingLeft < 0 ? getDotString(-p.paddingLeft - 1) : "";
    const topLine = cornerPad + p.tl + p.t.repeat(hRepeat) + p.tr;
    const topMeasured = measureString(topLine, fs);
    const topRenderW = topMeasured.length > 0
      ? topMeasured[topMeasured.length - 1].x + topMeasured[topMeasured.length - 1].width
      : measureCharWidth(p.t, fs) * hRepeat;
    const lW = measureCharWidth(p.l, fs);
    const rW = measureCharWidth(p.r, fs);
    const midInner = Math.max(0, topRenderW - lW - rW - padRSub * (fs / 16));
    const spacer = <span style={{ display: "inline-block", width: midInner }} />;
    return (
      <>
        {cornerPad}{p.tl}{p.t.repeat(hRepeat)}{p.tr}{"\n"}
        {padL}{p.l}{spacer}{padR}{p.r}{"\n"}
        {cornerPad}{p.bl}{p.b.repeat(hRepeat)}{p.br}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={activePaletteIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setActivePaletteIndex(idx);
            useConfigStore.getState().updateConfig({ activePaletteIndex: idx });
          }}
        >
          {paletteSet.palettes.map((p, i) => (
            <option key={i} value={i}>{p.type === "box" ? `📦 ${p.name}` : p.type === "stamp" ? `🗂 ${p.name}` : p.name}</option>
          ))}
        </select>
        <div className={styles.menuBtn} ref={menuBtnRef} onMouseDown={handleMenu}>
          <MoreVertical size={14} />
        </div>
      </div>

      {/* 캐릭터 그리드 */}
      {isChar && (
        <div className={styles.grid}>
          {palette.chars.map((ch, i) => (
            <div
              key={i}
              className={`${styles.charBtn} ${selectedIndices.has(i) ? styles.charSelected : ""}`}
              title={`U+${ch.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`}
              onMouseDown={(e) => handleItemClick(i, e)}
              onDoubleClick={(e) => { e.preventDefault(); insertChar(ch); }}
            >
              {ch}
            </div>
          ))}
          {palette.chars.length === 0 && (
            <div className={styles.empty}>{t("palette.addChar")}</div>
          )}
        </div>
      )}

      {/* 박스 리스트 */}
      {isBox && (
        <div className={styles.boxList}>
          {palette.boxes.map((box, i) => (
            <div
              key={i}
              className={`${styles.boxItem} ${selectedIndices.has(i) ? styles.boxSelected : ""} ${activeBoxPreset === box ? styles.boxActive : ""}`}
              onMouseDown={(e) => handleItemClick(i, e)}
            >
              <pre className={styles.boxPreview}>{boxPreview(box)}</pre>
              <span className={styles.boxName}>{box.name}</span>
            </div>
          ))}
          {palette.boxes.length === 0 && (
            <div className={styles.empty}>{t("box.add")}</div>
          )}
        </div>
      )}

      {/* 스탬프 리스트 */}
      {isStamp && palette.type === "stamp" && (
        <div className={styles.boxList}>
          {palette.stamps.map((stamp, i) => (
            <div
              key={i}
              className={`${styles.boxItem} ${selectedIndices.has(i) ? styles.boxSelected : ""} ${activeStampPreset === stamp ? styles.boxActive : ""}`}
              onMouseDown={(e) => handleItemClick(i, e)}
            >
              <pre className={styles.stampPreview}>{stamp.text.split("\n").slice(0, 3).join("\n")}{stamp.text.split("\n").length > 3 ? "\n..." : ""}</pre>
              <span className={styles.boxName}>{stamp.name}</span>
            </div>
          ))}
          {palette.stamps.length === 0 && (
            <div className={styles.empty}>{t("stamp.add")}</div>
          )}
        </div>
      )}

      {menuOpen && (
        <div ref={menuRef} className={styles.menu} style={{ left: menuPos.left, top: menuPos.top }}>
          {/* 타입별 액션 */}
          {isChar && (
            <>
              <div className={styles.menuItem} onClick={() => menuAction("addChar")}>{t("palette.addChar")}</div>
              {selectedIndices.size > 0 && (
                <div className={styles.menuItem} onClick={() => menuAction("removeSelectedChars")} style={{ color: "#f44" }}>
                  {t("palette.deleteSelected")} ({selectedIndices.size})
                </div>
              )}
            </>
          )}
          {isBox && (
            <>
              <div className={styles.menuItem} onClick={() => menuAction("addBox")}>{t("box.add")}</div>
              {selectedIndices.size === 1 && (
                <div className={styles.menuItem} onClick={() => menuAction("editBox")}>{t("box.edit")}</div>
              )}
              {selectedIndices.size > 0 && (
                <div className={styles.menuItem} onClick={() => menuAction("removeSelectedBoxes")} style={{ color: "#f44" }}>
                  {t("box.deleteSelected")} ({selectedIndices.size})
                </div>
              )}
            </>
          )}
          {isStamp && (
            <>
              <div className={styles.menuItem} onClick={() => menuAction("addStamp")}>{t("stamp.add")}</div>
              {selectedIndices.size === 1 && (
                <div className={styles.menuItem} onClick={() => menuAction("editStamp")}>{t("stamp.edit")}</div>
              )}
              {selectedIndices.size > 0 && (
                <div className={styles.menuItem} onClick={() => menuAction("removeSelectedStamps")} style={{ color: "#f44" }}>
                  {t("stamp.deleteSelected")} ({selectedIndices.size})
                </div>
              )}
            </>
          )}
          <div className={styles.menuSep} />
          {/* 팔레트 관리 */}
          <div className={styles.menuItem} onClick={() => menuAction("addCharPalette")}>{t("palette.addCharPalette")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("addBoxPalette")}>{t("palette.addBoxPalette")}</div>
          <div className={styles.menuItem} onClick={() => menuAction("addStampPalette")}>{t("palette.addStampPalette")}</div>
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

async function saveFileWithDialog(content: string, filename: string) {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const ext = filename.split(".").pop() ?? "json";
    const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return null;
    await invoke("save_json_file", { path, data: JSON.parse(content) });
    return path;
  } catch { /* browser fallback */ }
  if ("showSaveFilePicker" in window) {
    try {
      const ext = filename.split(".").pop() ?? "json";
      const handle = await (window as any).showSaveFilePicker({ suggestedName: filename, types: [{ description: ext.toUpperCase(), accept: { "application/json": [`.${ext}`] } }] });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return handle.name;
    } catch (e: any) { if (e.name === "AbortError") return null; }
  }
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return filename;
}

function pickJsonFile(accept: string): Promise<any | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try { resolve(JSON.parse(await file.text())); } catch { resolve(null); }
    };
    input.click();
  });
}
