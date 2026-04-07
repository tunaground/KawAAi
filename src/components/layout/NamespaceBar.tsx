import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import styles from "./NamespaceBar.module.css";

export function NamespaceBar() {
  const namespaces = useProjectStore((s) => s.project.namespaces);
  const activeNamespaceId = useProjectStore((s) => s.project.activeNamespaceId);
  const switchNamespace = useProjectStore((s) => s.switchNamespace);
  const closeNamespace = useProjectStore((s) => s.closeNamespace);
  const createNamespace = useProjectStore((s) => s.createNamespace);
  const renameNamespace = useProjectStore((s) => s.renameNamespace);
  const reorderNamespaces = useProjectStore((s) => s.reorderNamespaces);

  const [editingNsId, setEditingNsId] = useState<number | null>(null);

  // 드래그 상태
  const dragRef = useRef<{ nsId: number; startX: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAdd = () => {
    createNamespace();
  };

  // 드래그 이벤트
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(e.clientX - dragRef.current.startX) < 5) return;

      const bar = document.querySelector(`.${styles.nsBar}`);
      if (!bar) return;
      const tabs = bar.querySelectorAll(`[data-ns-id]`);
      for (let i = 0; i < tabs.length; i++) {
        const rect = tabs[i].getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const midX = rect.left + rect.width / 2;
          setDragOverIndex(e.clientX < midX ? i : i + 1);
          return;
        }
      }
    };

    const onMouseUp = () => {
      if (dragRef.current && dragOverIndex !== null) {
        const fromIndex = namespaces.findIndex((n) => n.id === dragRef.current!.nsId);
        let toIndex = dragOverIndex;
        if (fromIndex !== -1 && toIndex !== fromIndex && toIndex !== fromIndex + 1) {
          if (toIndex > fromIndex) toIndex--;
          reorderNamespaces(fromIndex, toIndex);
        }
      }
      dragRef.current = null;
      setDragOverIndex(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [namespaces, reorderNamespaces, dragOverIndex]);

  return (
    <div className={styles.nsBar}>
      {namespaces.map((ns, i) => (
        <div
          key={ns.id}
          data-ns-id={ns.id}
          className={`${styles.tab} ${ns.id === activeNamespaceId ? styles.active : ""}`}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest(`.${styles.tabClose}`)) return;
            if ((e.target as HTMLElement).closest("input")) return;
            dragRef.current = { nsId: ns.id, startX: e.clientX };
            if (ns.id !== activeNamespaceId) switchNamespace(ns.id);
          }}
          style={
            dragOverIndex === i
              ? { borderLeft: "2px solid var(--accent)" }
              : dragOverIndex === i + 1 && i === namespaces.length - 1
                ? { borderRight: "2px solid var(--accent)" }
                : undefined
          }
        >
          {editingNsId === ns.id ? (
            <input
              className={styles.tabNameInput}
              defaultValue={ns.name}
              autoFocus
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) renameNamespace(ns.id, val);
                setEditingNsId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingNsId(null);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={styles.tabName}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNsId(ns.id);
              }}
            >
              {ns.name}
            </span>
          )}
          {namespaces.length > 1 && (
            <span
              className={styles.tabClose}
              onMouseDown={(e) => {
                e.stopPropagation();
                closeNamespace(ns.id);
              }}
            >
              <X size={8} />
            </span>
          )}
        </div>
      ))}
      <div className={`${styles.tab} ${styles.tabAdd}`} onMouseDown={handleAdd}>
        <Plus size={12} />
      </div>
    </div>
  );
}
