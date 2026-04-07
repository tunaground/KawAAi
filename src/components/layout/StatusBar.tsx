import { useProjectStore } from "../../stores/projectStore";
import { useStatusStore } from "../../stores/statusStore";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const layers = useProjectStore((s) => s.layers);
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);
  const message = useStatusStore((s) => s.message);

  const active = layers.find((l) => l.id === activeLayerId);
  const info = active
    ? `${active.name} (${Math.round(active.x)}, ${active.y}) [${selectedLayerIds.size} selected]`
    : "-";

  return (
    <div className={styles.statusBar}>
      <span>{message}</span>
      <span>{info}</span>
    </div>
  );
}
