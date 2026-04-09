import { useState, useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { useI18n } from "../../i18n";
import { measureCharWidth, measureString } from "../../lib/fontMetrics";
import { getDotString } from "../../lib/dotInput";
import type { BoxPreset } from "../../types/palette";
import styles from "./BoxInputModal.module.css";

const PREVIEW_FONT_SIZE = 14;

interface BoxModalRequest {
  initial?: BoxPreset;
  resolve: (value: BoxPreset | null) => void;
}

interface BoxModalStore {
  request: BoxModalRequest | null;
  setRequest: (r: BoxModalRequest | null) => void;
}

const useBoxModalStore = create<BoxModalStore>((set) => ({
  request: null,
  setRequest: (r) => set({ request: r }),
}));

export function showBoxInputModal(initial?: BoxPreset): Promise<BoxPreset | null> {
  return new Promise((resolve) => {
    useBoxModalStore.getState().setRequest({ initial, resolve });
  });
}

export function BoxInputModal() {
  const t = useI18n((s) => s.t);
  const request = useBoxModalStore((s) => s.request);
  const setRequest = useBoxModalStore((s) => s.setRequest);

  const [name, setName] = useState("");
  const [tl, setTl] = useState("+");
  const [tc, setTc] = useState("-");
  const [tr, setTr] = useState("+");
  const [ml, setMl] = useState("|");
  const [mr, setMr] = useState("|");
  const [bl, setBl] = useState("+");
  const [bc, setBc] = useState("-");
  const [br, setBr] = useState("+");
  const [padLeft, setPadLeft] = useState(0);
  const [padRight, setPadRight] = useState(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (request) {
      const p = request.initial;
      setName(p?.name ?? "");
      setTl(p?.tl ?? "+"); setTc(p?.t ?? "-"); setTr(p?.tr ?? "+");
      setMl(p?.l ?? "|"); setMr(p?.r ?? "|");
      setBl(p?.bl ?? "+"); setBc(p?.b ?? "-"); setBr(p?.br ?? "+");
      setPadLeft(p?.paddingLeft ?? 0); setPadRight(p?.paddingRight ?? 0);
      setPreviewSize(null);
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [request]);

  // ResizeObserver로 프리뷰 크기 추적
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPreviewSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [request]);

  const close = useCallback(
    (result: BoxPreset | null) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request, setRequest],
  );

  const handleOk = () => {
    if (!name.trim()) return;
    close({
      name: name.trim(),
      tl, t: tc, tr,
      l: ml, r: mr,
      bl, b: bc, br,
      paddingLeft: padLeft,
      paddingRight: padRight,
    });
  };

  // 프리뷰: 크기에 맞춰서 박스를 가득 채움
  const renderPreview = () => {
    const fs = PREVIEW_FONT_SIZE;
    const lh = fs * 1.3;
    const padLAdj = padLeft > 0 ? padLeft : 0;
    const padRAdj = padRight > 0 ? padRight : 0;
    const padRSub = padRight < 0 ? -padRight : 0;
    const padL = padLAdj > 0 ? getDotString(padLAdj - 1) : "";
    const padR = padRAdj > 0 ? getDotString(padRAdj - 1) : "";
    // PL 음수 → 상/하 모서리 앞 패딩
    const cornerPad = padLeft < 0 ? getDotString(-padLeft - 1) : "";

    const tlW = measureCharWidth(tl, fs);
    const trW = measureCharWidth(tr, fs);
    const lW = measureCharWidth(ml, fs);
    const rW = measureCharWidth(mr, fs);
    const tW = measureCharWidth(tc, fs);
    const bW = measureCharWidth(bc, fs);

    const pw = (previewSize?.w ?? 200) - 16;
    const ph = (previewSize?.h ?? 80) - 12;

    const rightMargin = 20;
    const topInner = Math.max(0, pw - rightMargin - tlW - trW);
    const hRepeat = tW > 0 ? Math.max(1, Math.round(topInner / tW)) : 0;
    const topLine = cornerPad + tl + tc.repeat(hRepeat) + tr;
    const topMeasured = measureString(topLine, fs);
    const topRenderW = topMeasured.length > 0
      ? topMeasured[topMeasured.length - 1].x + topMeasured[topMeasured.length - 1].width
      : pw;
    // PR 음수만 midInner에서 차감 (PL 음수는 cornerPad가 topRenderW에 포함)
    const midInner = Math.max(0, topRenderW - lW - rW - padRSub * (fs / 16));
    const botInner = Math.max(0, topRenderW - measureCharWidth(bl, fs) - measureCharWidth(br, fs));
    const botRepeat = bW > 0 ? Math.max(1, Math.round(botInner / bW)) : 0;
    const totalLines = Math.max(3, Math.round(ph / lh));
    const midLines = totalLines - 2;

    const spacer = <span style={{ display: "inline-block", width: midInner }} />;
    const midRow = <>{padL}{ml}{spacer}{padR}{mr}</>;
    return (
      <>
        {cornerPad}{tl}{tc.repeat(hRepeat)}{tr}
        {Array.from({ length: midLines }, (_, i) => (
          <span key={i}>{"\n"}{midRow}</span>
        ))}
        {"\n"}{cornerPad}{bl}{bc.repeat(botRepeat)}{br}
      </>
    );
  };

  if (!request) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => close(null)}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>{t("box.add")}</div>

        <input
          ref={nameRef}
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("box.namePrompt")}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleOk();
            if (e.key === "Escape") close(null);
          }}
        />

        <div className={styles.grid}>
          {/* 상단행: _  TL  T  TR */}
          <div />
          <CharInput value={tl} onChange={setTl} />
          <CharInput value={tc} onChange={setTc} />
          <CharInput value={tr} onChange={setTr} />

          {/* 중간행: PL  L  PR  R */}
          <PadInput value={padLeft} onChange={setPadLeft} label="L" allowNegative />
          <CharInput value={ml} onChange={setMl} />
          <PadInput value={padRight} onChange={setPadRight} label="R" allowNegative />
          <CharInput value={mr} onChange={setMr} />

          {/* 하단행: _  BL  B  BR */}
          <div />
          <CharInput value={bl} onChange={setBl} />
          <CharInput value={bc} onChange={setBc} />
          <CharInput value={br} onChange={setBr} />
        </div>

        <pre ref={previewRef} className={styles.preview}>{renderPreview()}</pre>

        <div className={styles.btns}>
          <button className={styles.btnCancel} onClick={() => close(null)}>
            {t("modal.cancel")}
          </button>
          <button className={styles.btnOk} onClick={handleOk}>
            {t("modal.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CharInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className={styles.charInput}
      value={value}
      onChange={(e) => {
        const v = [...e.target.value];
        onChange(v.length > 0 ? v[v.length - 1] : "");
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}

function PadInput({ value, onChange, label, allowNegative }: { value: number; onChange: (v: number) => void; label: string; allowNegative?: boolean }) {
  const min = allowNegative ? -31 : 0;
  return (
    <div className={styles.padCell}>
      <span className={styles.padLabel}>{label}</span>
      <input
        type="number"
        className={styles.padInput}
        value={value}
        min={min}
        max={31}
        onChange={(e) => onChange(Math.max(min, Math.min(31, parseInt(e.target.value) || 0)))}
      />
    </div>
  );
}
