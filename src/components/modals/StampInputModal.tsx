import { useState, useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { useI18n } from "../../i18n";
import type { StampPreset } from "../../types/palette";
import styles from "./StampInputModal.module.css";

interface StampModalRequest {
  initial?: StampPreset;
  resolve: (value: StampPreset | null) => void;
}

interface StampModalStore {
  request: StampModalRequest | null;
  setRequest: (r: StampModalRequest | null) => void;
}

const useStampModalStore = create<StampModalStore>((set) => ({
  request: null,
  setRequest: (r) => set({ request: r }),
}));

export function showStampInputModal(initial?: StampPreset): Promise<StampPreset | null> {
  return new Promise((resolve) => {
    useStampModalStore.getState().setRequest({ initial, resolve });
  });
}

export function StampInputModal() {
  const t = useI18n((s) => s.t);
  const request = useStampModalStore((s) => s.request);
  const setRequest = useStampModalStore((s) => s.setRequest);

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request) {
      setName(request.initial?.name ?? "");
      setText(request.initial?.text ?? "");
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [request]);

  const close = useCallback(
    (result: StampPreset | null) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request, setRequest],
  );

  const handleOk = () => {
    if (!name.trim() || !text.trim()) return;
    close({ name: name.trim(), text });
  };

  if (!request) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => close(null)}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>{t("stamp.add")}</div>

        <input
          ref={nameRef}
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("stamp.namePrompt")}
          onKeyDown={(e) => {
            if (e.key === "Escape") close(null);
          }}
        />

        <textarea
          className={styles.textArea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("stamp.textPrompt")}
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Escape") close(null);
          }}
        />

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
