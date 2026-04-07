import { useRef, useCallback, useEffect } from "react";
import styles from "./PanelResize.module.css";

interface PanelResizeProps {
  side: "left" | "right";
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function PanelResize({ side, targetRef }: PanelResizeProps) {
  const dragRef = useRef<{ startX: number; origW: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const el = targetRef.current;
      if (!el) return;
      dragRef.current = { startX: e.clientX, origW: el.offsetWidth };
    },
    [targetRef]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !targetRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      // 최대 폭: 윈도우 폭의 80% (왼쪽/오른쪽 패널이 화면 대부분을 차지할 수 있도록)
      const maxW = Math.floor(window.innerWidth * 0.8);
      const w =
        side === "left"
          ? Math.max(150, Math.min(maxW, dragRef.current.origW + dx))
          : Math.max(200, Math.min(maxW, dragRef.current.origW - dx));
      targetRef.current.style.width = w + "px";
    };
    const onUp = () => {
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [side, targetRef]);

  return <div className={styles.handle} onMouseDown={handleMouseDown} />;
}
