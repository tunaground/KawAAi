/** 런타임 전용 — 파일에 저장 안 됨 */

export type BlockSelectTool = "rect" | "brush";

export interface DragState {
  type: "move" | "resize";
  layerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

export interface LayerClipboard {
  name: string;
  type: "text" | "image";
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  textColor: string;
  opacity: number;
  imageSrc: string;
  saturation: number;
  opaqueRanges: import("./project").OpaqueRange[];
}
