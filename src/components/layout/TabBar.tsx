import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import styles from "./TabBar.module.css";

export function TabBar() {
  const allDocuments = useProjectStore((s) => s.project.documents);
  const activeDocId = useProjectStore((s) => s.project.activeDocId);
  const namespaces = useProjectStore((s) => s.project.namespaces);
  const activeNamespaceId = useProjectStore((s) => s.project.activeNamespaceId);
  const moveDocToNamespace = useProjectStore((s) => s.moveDocToNamespace);

  // 활성 네임스페이스의 문서만 표시
  const activeNs = namespaces.find((n) => n.id === activeNamespaceId);
  const documents = activeNs
    ? activeNs.docIds.map((id) => allDocuments.find((d) => d.id === id)).filter(Boolean) as typeof allDocuments
    : allDocuments;
  const switchDocument = useProjectStore((s) => s.switchDocument);
  const closeDocument = useProjectStore((s) => s.closeDocument);
  const createDocument = useProjectStore((s) => s.createDocument);
  const saveCurrentDocState = useProjectStore((s) => s.saveCurrentDocState);
  const restoreDocState = useProjectStore((s) => s.restoreDocState);
  const renameDocument = useProjectStore((s) => s.renameDocument);
  const reorderDocuments = useProjectStore((s) => s.reorderDocuments);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 드래그 상태
  const dragRef = useRef<{ docId: number; startX: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverNsId, setDragOverNsId] = useState<number | null>(null);

  const handleAdd = () => {
    saveCurrentDocState();
    const doc = createDocument();
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, activeDocId: doc.id },
    });
    restoreDocState();
  };

  // Tab bar focus tracking for document copy/paste
  const setTabBarFocused = useProjectStore((s) => s.setTabBarFocused);
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const inTabBar = (e.target as HTMLElement)?.closest(`.${styles.tabBar}`);
      setTabBarFocused(!!inTabBar);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [setTabBarFocused]);

  // 드래그 이벤트
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      if (Math.abs(e.clientX - dragRef.current.startX) < 5) return;

      // 네임스페이스 바 위에 있는지 확인
      const nsTab = (e.target as HTMLElement).closest("[data-ns-id]") as HTMLElement | null;
      if (nsTab) {
        setDragOverIndex(null);
        setDragOverNsId(parseInt(nsTab.dataset.nsId!));
        nsTab.classList.add("dropTarget");
        return;
      }
      setDragOverNsId(null);

      const tabBar = document.querySelector(`.${styles.tabBar}`);
      if (!tabBar) return;
      const tabs = tabBar.querySelectorAll(`[data-doc-id]`);
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
      if (dragRef.current) {
        if (dragOverNsId !== null && dragOverNsId !== activeNamespaceId) {
          moveDocToNamespace(dragRef.current.docId, dragOverNsId);
        } else if (dragOverIndex !== null) {
          const fromIndex = documents.findIndex((d) => d.id === dragRef.current!.docId);
          let toIndex = dragOverIndex;
          if (fromIndex !== -1 && toIndex !== fromIndex && toIndex !== fromIndex + 1) {
            if (toIndex > fromIndex) toIndex--;
            reorderDocuments(fromIndex, toIndex);
          }
        }
      }
      dragRef.current = null;
      setDragOverIndex(null);
      setDragOverNsId(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [documents, reorderDocuments, dragOverIndex]);

  return (
    <div className={styles.tabBar}>
      {documents.map((doc, i) => (
        <div
          key={doc.id}
          data-doc-id={doc.id}
          className={`${styles.tab} ${doc.id === activeDocId ? styles.active : ""}`}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest(`.${styles.tabClose}`)) return;
            if ((e.target as HTMLElement).closest("input")) return;
            dragRef.current = { docId: doc.id, startX: e.clientX };
            if (doc.id !== activeDocId) switchDocument(doc.id);
          }}
          style={dragOverIndex === i ? { borderLeft: "2px solid var(--accent)" } : dragOverIndex === i + 1 && i === documents.length - 1 ? { borderRight: "2px solid var(--accent)" } : undefined}
        >
          {editingDocId === doc.id ? (
            <input
              ref={inputRef}
              className={styles.tabNameInput}
              defaultValue={doc.name}
              autoFocus
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) renameDocument(doc.id, val);
                setEditingDocId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
                if (e.key === "Escape") { setEditingDocId(null); }
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={styles.tabName}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingDocId(doc.id);
              }}
            >
              {doc.name}
            </span>
          )}
          {documents.length > 1 && (
            <span
              className={styles.tabClose}
              onMouseDown={(e) => {
                e.stopPropagation();
                closeDocument(doc.id);
              }}
            >
              <X size={10} />
            </span>
          )}
        </div>
      ))}
      <div className={`${styles.tab} ${styles.tabAdd}`} onMouseDown={handleAdd}>
        <Plus size={14} />
      </div>
    </div>
  );
}
