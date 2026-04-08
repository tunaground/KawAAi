/**
 * 레이어 작업: 병합 등
 */
import { useProjectStore } from "../stores/projectStore";
import { saveUndoSnapshot } from "../stores/projectStore";
import { setStatus } from "../stores/projectStore";
import { t } from "../i18n";
import { compositeLayersSubset } from "./compositor";
import { getMeasureCtx, LAYER_PADDING } from "./fontMetrics";
import { getSnapX } from "./compositor";

/** 선택된 텍스트 레이어들을 합성하여 하나로 병합 */
export function mergeSelectedLayers() {
  const store = useProjectStore.getState();
  const selected = store.layers.filter(
    (l) => store.selectedLayerIds.has(l.id) && l.type === "text"
  );
  if (selected.length < 2) {
    setStatus(t("layer.mergeNeed2"));
    return;
  }

  // undo snapshot
  saveUndoSnapshot();

  // bounding box origin
  let minX = Infinity, minY = Infinity;
  selected.forEach((l) => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
  });

  const { fontSize, lineHeight } = store;

  // 합성
  const mergedLines = compositeLayersSubset(selected, minX, minY, fontSize, lineHeight);
  const mergedText = mergedLines.join("\n");

  // 기존 레이어 제거
  const removedIds = new Set(selected.map((l) => l.id));
  const remainingLayers = store.layers.filter((l) => !removedIds.has(l.id));

  // 크기 계산
  const ctx = getMeasureCtx(fontSize);
  const textLines = mergedText.split("\n");
  let maxW = 0;
  textLines.forEach((line) => {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  });
  let w = Math.ceil(maxW + LAYER_PADDING * 2);
  let h = textLines.length * lineHeight + LAYER_PADDING * 2;
  const snapX = getSnapX(fontSize);
  if (store.viewSettings.snapEnabled) {
    w = Math.ceil(w / snapX) * snapX;
    h = Math.ceil(h / lineHeight) * lineHeight;
  }

  // 새 레이어
  const id = store.nextLayerId;
  const newLayer = {
    id,
    type: "text" as const,
    name: "Merged",
    text: mergedText,
    x: minX,
    y: minY,
    w,
    h,
    visible: true,
    locked: false,
    color: "#2196f3",
    textColor: "#000000",
    opacity: 1,
    imageSrc: "",
    opaqueRanges: [],
  };

  useProjectStore.setState({
    layers: [...remainingLayers, newLayer],
    nextLayerId: id + 1,
    activeLayerId: id,
    selectedLayerIds: new Set([id]),
  });

  setStatus(`${selected.length}${t("layer.merged")}`);
}
