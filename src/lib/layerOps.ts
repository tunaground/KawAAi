/**
 * 레이어 작업: 병합 등
 */
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { setStatus } from "../stores/statusStore";
import { compositeLayersSubset } from "./compositor";
import { getMeasureCtx, LINE_HEIGHT, LAYER_PADDING } from "./fontMetrics";
import { getSnapX } from "./compositor";

/** 선택된 텍스트 레이어들을 합성하여 하나로 병합 */
export function mergeSelectedLayers() {
  const store = useProjectStore.getState();
  const selected = store.layers.filter(
    (l) => store.selectedLayerIds.has(l.id) && l.type === "text"
  );
  if (selected.length < 2) {
    setStatus("병합할 텍스트 레이어를 2개 이상 선택하세요");
    return;
  }

  // undo snapshot
  useEditorStore.getState().pushUndo({
    layers: store.layers.map((l) => ({ ...l })),
    activeLayerId: store.activeLayerId,
    selectedLayerIds: [...store.selectedLayerIds],
    nextLayerId: store.nextLayerId,
  });

  // bounding box origin
  let minX = Infinity, minY = Infinity;
  selected.forEach((l) => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
  });

  // 합성
  const mergedLines = compositeLayersSubset(selected, minX, minY);
  const mergedText = mergedLines.join("\n");

  // 기존 레이어 제거
  const removedIds = new Set(selected.map((l) => l.id));
  const remainingLayers = store.layers.filter((l) => !removedIds.has(l.id));

  // 크기 계산
  const ctx = getMeasureCtx();
  const textLines = mergedText.split("\n");
  let maxW = 0;
  textLines.forEach((line) => {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  });
  let w = Math.ceil(maxW + LAYER_PADDING * 2);
  let h = textLines.length * LINE_HEIGHT + LAYER_PADDING * 2;
  const snapX = getSnapX();
  if (store.viewSettings.snapEnabled) {
    w = Math.ceil(w / snapX) * snapX;
    h = Math.ceil(h / LINE_HEIGHT) * LINE_HEIGHT;
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
  };

  useProjectStore.setState({
    layers: [...remainingLayers, newLayer],
    nextLayerId: id + 1,
    activeLayerId: id,
    selectedLayerIds: new Set([id]),
  });

  setStatus(`${selected.length}개 레이어 병합됨`);
}
