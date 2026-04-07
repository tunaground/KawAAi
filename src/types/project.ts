/** 네임스페이스 — MLT 섹션에 대응. 문서의 그룹. */
export interface Namespace {
  id: number;
  name: string;
  docIds: number[];
}

/** .aaproj 파일 구조 */
export interface ProjectFile {
  version: number;
  name: string;
  documents: Document[];
  activeDocId: number;
  nextDocId: number;
  namespaces: Namespace[];
  activeNamespaceId: number;
  nextNamespaceId: number;
}

/** .aadoc 파일 구조 (문서 단위 export/import) */
export interface Document {
  id: number;
  name: string;
  canvas: CanvasSize;
  layers: Layer[];
  activeLayerId: number | null;
  nextLayerId: number;
  viewSettings: ViewSettings;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface ViewSettings {
  snapEnabled: boolean;
  gridVisible: boolean;
  charGridEnabled: boolean;
}

/** 공백 불투명 영역 — 캐릭터 포지션 기반 */
export interface OpaqueRange {
  line: number;      // 줄 번호 (0-based)
  startCol: number;  // 시작 문자 인덱스 (inclusive)
  endCol: number;    // 끝 문자 인덱스 (exclusive)
}

/**
 * 레이어.
 * type='text': AA 텍스트 편집 레이어
 * type='image': 참고용 이미지 레이어 (합성 결과에 미포함)
 */
export interface Layer {
  id: number;
  type: "text" | "image";
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  locked: boolean;
  color: string;
  textColor: string;
  opacity: number;

  /** type='text' 전용 — AA 텍스트 (줄바꿈으로 구분) */
  text: string;

  /** type='image' 전용 — data URL */
  imageSrc: string;

  /** 공백 불투명 영역 — 채색된 부분의 공백은 합성 시 하위 레이어를 가림 */
  opaqueRanges: OpaqueRange[];
}
