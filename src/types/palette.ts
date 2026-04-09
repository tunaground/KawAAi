/** 박스 프리셋 */
export interface BoxPreset {
  name: string;
  tl: string; t: string; tr: string;
  l: string;  r: string;
  bl: string; b: string; br: string;
  paddingLeft: number;
  paddingRight: number;
}

/** 캐릭터 팔레트 */
export interface CharPalette {
  name: string;
  type: "char";
  chars: string[];
}

/** 박스 팔레트 */
export interface BoxPalette {
  name: string;
  type: "box";
  boxes: BoxPreset[];
}

/** 스탬프 프리셋 */
export interface StampPreset {
  name: string;
  text: string;
}

/** 스탬프 팔레트 */
export interface StampPalette {
  name: string;
  type: "stamp";
  stamps: StampPreset[];
}

/** 팔레트 (캐릭터, 박스, 스탬프) */
export type Palette = CharPalette | BoxPalette | StampPalette;

/** .aapals 파일 구조 */
export interface PaletteSetFile {
  version: number;
  name: string;
  palettes: Palette[];
}
