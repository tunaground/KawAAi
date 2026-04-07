import { useState, useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { useI18n } from "../../i18n";
import styles from "./InputModal.module.css";

interface ModalRequest {
  type: "input" | "confirm";
  title: string;
  defaultValue?: string;
  okLabel?: string;
  okClass?: string;
  resolve: (value: string | boolean | null) => void;
}

interface ModalStore {
  request: ModalRequest | null;
  setRequest: (r: ModalRequest | null) => void;
}

const useModalStore = create<ModalStore>((set) => ({
  request: null,
  setRequest: (r) => set({ request: r }),
}));

/** prompt 대체 */
export function showInputModal(title: string, defaultValue = ""): Promise<string | null> {
  return new Promise((resolve) => {
    useModalStore.getState().setRequest({
      type: "input",
      title,
      defaultValue,
      resolve: resolve as (v: string | boolean | null) => void,
    });
  });
}

/** confirm 대체 */
export function showConfirmModal(
  title: string,
  okLabel = "확인",
  okClass = "primary"
): Promise<boolean> {
  return new Promise((resolve) => {
    useModalStore.getState().setRequest({
      type: "confirm",
      title,
      okLabel,
      okClass,
      resolve: resolve as (v: string | boolean | null) => void,
    });
  });
}

export function InputModal() {
  const t = useI18n((s) => s.t);
  const request = useModalStore((s) => s.request);
  const setRequest = useModalStore((s) => s.setRequest);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request?.type === "input") {
      setValue(request.defaultValue ?? "");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [request]);

  const close = useCallback(
    (result: string | boolean | null) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request, setRequest]
  );

  if (!request) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => close(request.type === "confirm" ? false : null)}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>{request.title}</div>

        {request.type === "input" && (
          <input
            ref={inputRef}
            className={styles.input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") close(value);
              if (e.key === "Escape") close(null);
            }}
          />
        )}

        <div className={styles.btns}>
          <button
            className={styles.btnCancel}
            onClick={() => close(request.type === "confirm" ? false : null)}
          >
            {t("modal.cancel")}
          </button>
          <button
            className={
              request.okClass === "danger" ? styles.btnDanger : styles.btnOk
            }
            onClick={() =>
              close(request.type === "confirm" ? true : value)
            }
          >
            {request.okLabel ?? t("modal.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
