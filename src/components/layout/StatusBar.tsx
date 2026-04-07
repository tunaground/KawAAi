import { useProjectStore } from "../../stores/projectStore";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const message = useProjectStore((s) => s.statusMessage);
  const selectedCount = useProjectStore((s) => s.selectedLayerIds.size);
  const activeName = useProjectStore((s) => {
    const layer = s.layers.find((l) => l.id === s.activeLayerId);
    return layer?.name ?? null;
  });
  const activeX = useProjectStore((s) => {
    const layer = s.layers.find((l) => l.id === s.activeLayerId);
    return layer ? Math.round(layer.x) : 0;
  });
  const activeY = useProjectStore((s) => {
    const layer = s.layers.find((l) => l.id === s.activeLayerId);
    return layer?.y ?? 0;
  });

  const info = activeName
    ? `${activeName} (${activeX}, ${activeY}) [${selectedCount} selected]`
    : "-";

  return (
    <div className={styles.statusBar}>
      <span>{message}</span>
      <span>{info}</span>
    </div>
  );
}
