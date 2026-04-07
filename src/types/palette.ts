/** .aapals 파일 구조 (앱 설정 영역에 즉시 저장) */
export interface PaletteSetFile {
  version: number;
  name: string;
  palettes: Palette[];
}

/** .aapal 파일 구조 (단일 팔레트 export/import) */
export interface Palette {
  name: string;
  chars: string[];
}
