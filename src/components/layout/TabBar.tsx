import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./TabBar.module.css";

export function TabBar() {
  const project = useProjectStore((s) => s.project);
  const switchDocument = useProjectStore((s) => s.switchDocument);
  const closeDocument = useProjectStore((s) => s.closeDocument);
  const createDocument = useProjectStore((s) => s.createDocument);
  const saveCurrentDocState = useProjectStore((s) => s.saveCurrentDocState);
  const restoreDocState = useProjectStore((s) => s.restoreDocState);
  const renameDocument = useProjectStore((s) => s.renameDocument);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    saveCurrentDocState();
    const doc = createDocument();
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, activeDocId: doc.id },
    });
    restoreDocState();
  };

  // Tab bar focus tracking for document copy/paste
  const setTabBarFocused = useEditorStore((s) => s.setTabBarFocused);
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const inTabBar = (e.target as HTMLElement)?.closest(`.${styles.tabBar}`);
      setTabBarFocused(!!inTabBar);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [setTabBarFocused]);

  return (
    <div className={styles.tabBar}>
      {project.documents.map((doc) => (
        <div
          key={doc.id}
          className={`${styles.tab} ${doc.id === project.activeDocId ? styles.active : ""}`}
          onMouseDown={() => {
            if (doc.id !== project.activeDocId) switchDocument(doc.id);
          }}
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
          {project.documents.length > 1 && (
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
