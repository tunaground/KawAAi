import {
  X, FolderOpen, Save, Merge, PenTool, Paintbrush, Eraser,
  Magnet, Grid3x3, LetterText, Settings, Plus, Image,
  GripVertical, Lock, Unlock, Eye, EyeOff, Trash2,
  Copy, Download, PanelBottom, PanelRight, ExternalLink,
  ChevronsRight, ChevronsLeft, MoreVertical, RefreshCw,
  BookOpen,
} from "lucide-react";
import { useI18n } from "../../i18n";
import styles from "./ManualModal.module.css";

interface ManualModalProps {
  open: boolean;
  onClose: () => void;
}

const I = ({ children }: { children: React.ReactNode }) => (
  <span className={styles.icon}>{children}</span>
);
const isMac = navigator.platform.toUpperCase().includes("MAC") || navigator.userAgent.includes("Mac");
const K = ({ children }: { children: React.ReactNode }) => {
  const text = typeof children === "string" && isMac
    ? children.replace(/Ctrl/g, "⌘").replace(/Alt/g, "⌥").replace(/Shift/g, "⇧")
    : children;
  return <span className={styles.kbd}>{text}</span>;
};

export function ManualModal({ open, onClose }: ManualModalProps) {
  const locale = useI18n((s) => s.locale);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>
            <I><BookOpen size={16} /></I> {locale === "ja" ? "マニュアル" : locale === "en" ? "Manual" : "매뉴얼"}
          </span>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={styles.body}>
          {locale === "ja" ? <ManualJa /> : locale === "en" ? <ManualEn /> : <ManualKo />}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 한국어 매뉴얼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ManualKo() {
  return (
    <>
      <h2>개요</h2>
      <p>KawAAi는 일본 AA(아스키 아트, 야루오계) 전문 에디터입니다. 프로포셔널 폰트(MS PGothic / Saitamaar) 기반의 AA를 레이어 합성 방식으로 편집합니다.</p>

      <h2>화면 구성</h2>
      <p>앱은 5개 영역으로 구성됩니다:</p>
      <ul>
        <li><strong>헤더 툴바</strong> — 파일 관리, 레이어 도구, 뷰 설정, 설정</li>
        <li><strong>문서 탭</strong> — 다중 문서 전환</li>
        <li><strong>왼쪽 패널</strong> — 레이어 목록, 팔레트, MLT 라이브러리</li>
        <li><strong>캔버스</strong> — AA 편집 영역 (눈금자, 그리드, 가이드)</li>
        <li><strong>프리뷰 패널</strong> — 합성 결과 표시</li>
      </ul>

      <h2>파일 관리</h2>
      <ul>
        <li><I><FolderOpen size={14} /></I> <strong>열기</strong> (<K>Ctrl+O</K>) — 프로젝트 파일(.aaproj) 열기</li>
        <li><I><Save size={14} /></I> <strong>저장</strong> (<K>Ctrl+S</K>) — 현재 프로젝트 저장. 처음 저장 시 경로 선택</li>
        <li><strong>다른 이름으로 저장</strong> (<K>Ctrl+Shift+S</K>) — 새 경로에 저장</li>
        <li><strong>자동 저장</strong> — 설정에서 간격 지정 (안함/30초/1분/3분/5분/10분). 파일이 저장된 적 있는 경우에만 동작</li>
      </ul>
      <h3>파일 형식</h3>
      <ul>
        <li><strong>.aaproj</strong> — 프로젝트 파일 (모든 문서 포함)</li>
        <li><strong>.aadoc</strong> — 문서 단위 내보내기/가져오기</li>
        <li><strong>.aapal</strong> — 단일 팔레트</li>
        <li><strong>.aapals</strong> — 팔레트세트</li>
      </ul>

      <h2>문서 탭</h2>
      <ul>
        <li><K>Ctrl+N</K> — 새 문서 추가</li>
        <li><K>Ctrl+W</K> — 현재 문서 닫기 (최소 1개 유지)</li>
        <li><K>Ctrl+Shift+T</K> — 닫힌 문서 복원</li>
        <li><strong>더블클릭</strong> — 문서 이름 변경</li>
        <li>탭 클릭 후 <K>Ctrl+C</K>/<K>Ctrl+V</K> — 문서 복사/붙여넣기</li>
      </ul>

      <h2>레이어</h2>
      <h3>레이어 추가</h3>
      <ul>
        <li><I><Plus size={14} /></I> — 텍스트 레이어 추가</li>
        <li><I><Image size={14} /></I> — 이미지 레이어 추가 (참고용, 합성 결과에 미포함)</li>
      </ul>
      <h3>레이어 항목</h3>
      <ul>
        <li><I><GripVertical size={14} /></I> — 드래그로 레이어 순서 변경</li>
        <li><strong>색상 원</strong> — 클릭하여 텍스트 색상 변경</li>
        <li><strong>더블클릭</strong> — 레이어 이름 변경</li>
        <li><I><Lock size={14} /></I>/<I><Unlock size={14} /></I> — 잠금/해제 (잠긴 레이어는 이동/편집 불가)</li>
        <li><I><Eye size={14} /></I>/<I><EyeOff size={14} /></I> — 표시/숨김</li>
        <li><I><Trash2 size={14} /></I> — 삭제</li>
      </ul>
      <h3>다중 선택</h3>
      <ul>
        <li><K>Ctrl</K>+클릭 — 개별 토글</li>
        <li><K>Shift</K>+클릭 — 범위 선택</li>
      </ul>
      <h3>레이어 병합</h3>
      <p><I><Merge size={14} /></I> 텍스트 레이어 2개 이상 선택 후 병합 버튼 클릭. 합성 알고리즘으로 하나의 레이어로 합침.</p>
      <h3>복사/붙여넣기</h3>
      <p>레이어 선택 후 <K>Ctrl+C</K>/<K>Ctrl+V</K>. 텍스트 편집 중이 아닐 때 동작.</p>

      <h2>캔버스</h2>
      <ul>
        <li><strong>캔버스 크기 조절</strong> — 캔버스 우하단 모서리 드래그</li>
        <li><strong>레이어 이동</strong> — 레이어 우상단 삼각형 핸들 드래그</li>
        <li><strong>레이어 크기 조절</strong> — 레이어 우하단 삼각형 핸들 드래그</li>
      </ul>
      <h3>뷰 설정</h3>
      <ul>
        <li><I><Magnet size={14} /></I> <strong>스냅</strong> — 레이어 위치/크기를 그리드에 맞춤</li>
        <li><I><Grid3x3 size={14} /></I> <strong>그리드</strong> — 캔버스에 격자선 표시</li>
        <li><I><LetterText size={14} /></I> <strong>문자 그리드</strong> — 문자마다 빨강/파랑 배경을 교차 표시</li>
      </ul>

      <h2>텍스트 편집</h2>
      <ul>
        <li><strong>스페이스바</strong> — 도트 문자 순환 입력. 누를 때마다 Hair Space → Thin Space → ... 점점 넓은 공백으로 교체. 9단계 1사이클.</li>
        <li><strong>오버플로우 방지</strong> — 레이어 크기를 넘는 텍스트 입력 시 자동 롤백</li>
      </ul>

      <h2>공백 채색</h2>
      <p>AA에서 박스 안쪽 공백이 하위 레이어에 침범당하지 않도록 특정 영역의 공백을 불투명으로 마킹합니다.</p>
      <ul>
        <li><I><Paintbrush size={14} /></I> <strong>채색 모드</strong> — 활성 레이어 위를 드래그하여 공백 채색. 노란색으로 표시.</li>
        <li><I><Eraser size={14} /></I> <strong>제거 모드</strong> — 드래그하여 채색 제거</li>
        <li><I><X size={14} /></I> 또는 <K>Escape</K> — 모드 취소</li>
        <li>활성 버튼을 다시 누르면 일반 모드로 복귀</li>
      </ul>

      <h2>레이어 캔버스 (간이 편집)</h2>
      <p><I><PenTool size={14} /></I> 버튼으로 모달을 열고, 이미지를 참고하면서 AA를 작성한 뒤 레이어로 삽입합니다.</p>
      <ul>
        <li><strong>이미지 불러오기</strong> — 참고 이미지 로드. 크기/투명도 조절 가능. 우상단 핸들로 위치 이동.</li>
        <li><strong>편집창 크기 조절</strong> — 우하단 핸들 드래그</li>
        <li><strong>글씨색</strong> — 색상 선택</li>
        <li><strong>레이어로 삽입</strong> — 작성한 텍스트를 현재 문서에 새 레이어로 추가</li>
      </ul>

      <h2>팔레트</h2>
      <p>자주 사용하는 AA 문자를 팔레트에 등록하여 빠르게 삽입합니다.</p>
      <ul>
        <li><strong>드롭다운</strong>으로 팔레트 전환</li>
        <li><strong>문자 클릭</strong> — 활성 레이어의 커서 위치에 삽입</li>
        <li><strong>문자 우클릭</strong> — 삭제</li>
        <li><I><MoreVertical size={14} /></I> <strong>메뉴</strong>:
          <ul>
            <li>캐릭터 추가, 팔레트 추가, 팔레트 삭제</li>
            <li>팔레트 임포트/익스포트 (.aapal)</li>
            <li>팔레트세트 임포트/익스포트 (.aapals)</li>
          </ul>
        </li>
      </ul>

      <h2>라이브러리 (MLT)</h2>
      <p>MLT 파일에서 AA를 찾아 레이어로 삽입합니다. 읽기 전용.</p>
      <ul>
        <li><I><FolderOpen size={14} /></I> — MLT 파일이 있는 디렉토리 선택. 경로는 앱 설정에 저장.</li>
        <li><I><RefreshCw size={14} /></I> — 파일 목록 새로고침</li>
        <li><strong>드롭다운 1</strong> — MLT 파일 선택</li>
        <li><strong>드롭다운 2</strong> — 섹션 선택 (파일 내 섹션 헤더 기반)</li>
        <li><strong>AA 항목 클릭</strong> — 레이어로 삽입</li>
        <li><strong>AA 항목 마우스 오버</strong> — 큰 프리뷰 팝업 표시</li>
      </ul>

      <h2>합성 결과</h2>
      <p>모든 visible 텍스트 레이어를 합성한 최종 AA를 표시합니다.</p>
      <ul>
        <li><I><Copy size={14} /></I> — 클립보드에 복사</li>
        <li><I><Download size={14} /></I> — .txt 파일로 내보내기 (문서명.txt)</li>
        <li><I><PanelBottom size={14} /></I>/<I><PanelRight size={14} /></I> — 패널 위치 전환 (하단/우측)</li>
        <li><I><ExternalLink size={14} /></I> — 별도 창으로 분리 (Tauri 환경)</li>
        <li><I><ChevronsRight size={14} /></I>/<I><ChevronsLeft size={14} /></I> — 접기/펼치기</li>
      </ul>

      <h2>설정</h2>
      <p><I><Settings size={14} /></I> 버튼으로 설정 모달을 엽니다.</p>
      <ul>
        <li><strong>언어</strong> — 한국어 / 日本語 / English</li>
        <li><strong>테마</strong> — 시스템 / 라이트 / 다크</li>
        <li><strong>자동 저장</strong> — 안함 / 30초 / 1분 / 3분 / 5분 / 10분</li>
      </ul>

      <h2>단축키 일람표</h2>
      <table className={styles.shortcutTable}>
        <thead><tr><th>단축키</th><th>기능</th></tr></thead>
        <tbody>
          <tr><td><K>Ctrl+N</K></td><td>새 문서</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>문서 닫기</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>닫힌 문서 복원</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>열기</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>저장</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>다른 이름으로 저장</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>되돌리기</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K> / <K>Ctrl+Y</K></td><td>다시 실행</td></tr>
          <tr><td><K>Ctrl+C</K></td><td>레이어 복사 (탭 포커스: 문서 복사)</td></tr>
          <tr><td><K>Ctrl+V</K></td><td>레이어 붙여넣기 (탭 포커스: 문서 붙여넣기)</td></tr>
          <tr><td><K>Escape</K></td><td>채색 모드 해제 / 선택 해제</td></tr>
          <tr><td><K>Space</K></td><td>도트 문자 순환 입력</td></tr>
        </tbody>
      </table>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 일본어 매뉴얼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ManualJa() {
  return (
    <>
      <h2>概要</h2>
      <p>KawAAiは日本AA（アスキーアート、やる夫系）専門エディタです。プロポーショナルフォント（MS PGothic / Saitamaar）ベースのAAをレイヤー合成方式で編集します。</p>

      <h2>画面構成</h2>
      <ul>
        <li><strong>ヘッダーツールバー</strong> — ファイル管理、レイヤーツール、表示設定</li>
        <li><strong>ドキュメントタブ</strong> — 複数ドキュメント切替</li>
        <li><strong>左パネル</strong> — レイヤー一覧、パレット、MLTライブラリ</li>
        <li><strong>キャンバス</strong> — AA編集領域</li>
        <li><strong>プレビューパネル</strong> — 合成結果表示</li>
      </ul>

      <h2>ファイル管理</h2>
      <ul>
        <li><I><FolderOpen size={14} /></I> <strong>開く</strong> (<K>Ctrl+O</K>)</li>
        <li><I><Save size={14} /></I> <strong>保存</strong> (<K>Ctrl+S</K>) / 名前を付けて保存 (<K>Ctrl+Shift+S</K>)</li>
        <li><strong>自動保存</strong> — 設定で間隔指定</li>
      </ul>
      <h3>ファイル形式</h3>
      <ul>
        <li><strong>.aaproj</strong> — プロジェクトファイル（全ドキュメント含む）</li>
        <li><strong>.aapal</strong> — パレット / <strong>.aapals</strong> — パレットセット</li>
      </ul>

      <h2>ドキュメントタブ</h2>
      <ul>
        <li><K>Ctrl+N</K> — 新規ドキュメント</li>
        <li><K>Ctrl+W</K> — ドキュメントを閉じる（最低1つ維持）</li>
        <li><K>Ctrl+Shift+T</K> — 閉じたドキュメントを復元</li>
        <li><strong>ダブルクリック</strong> — ドキュメント名変更</li>
        <li>タブクリック後 <K>Ctrl+C</K>/<K>Ctrl+V</K> — ドキュメントコピー/貼り付け</li>
      </ul>

      <h2>レイヤー</h2>
      <ul>
        <li><I><Plus size={14} /></I> テキストレイヤー追加 / <I><Image size={14} /></I> 画像レイヤー追加</li>
        <li><I><GripVertical size={14} /></I> ドラッグで順序変更</li>
        <li><I><Lock size={14} /></I>/<I><Unlock size={14} /></I> ロック / <I><Eye size={14} /></I>/<I><EyeOff size={14} /></I> 表示 / <I><Trash2 size={14} /></I> 削除</li>
        <li><I><Merge size={14} /></I> レイヤー結合（2つ以上選択）</li>
        <li><K>Ctrl</K>+クリック: 複数選択、<K>Shift</K>+クリック: 範囲選択</li>
      </ul>

      <h2>空白塗り</h2>
      <ul>
        <li><I><Paintbrush size={14} /></I> 塗りモード — ドラッグで空白を不透明に（黄色表示）</li>
        <li><I><Eraser size={14} /></I> 消去モード — ドラッグで塗り消去</li>
        <li><I><X size={14} /></I> または <K>Escape</K> でモードキャンセル</li>
      </ul>

      <h2>テキスト編集</h2>
      <ul>
        <li><strong>スペースバー</strong> — ドット文字サイクル入力。Hair Space → Thin Space → ... 9段階。</li>
      </ul>

      <h2>レイヤーキャンバス</h2>
      <p><I><PenTool size={14} /></I> ボタンでモーダルを開き、画像を参考にAAを作成してレイヤーとして挿入。</p>

      <h2>パレット</h2>
      <ul>
        <li><strong>文字クリック</strong> — アクティブレイヤーのカーソル位置に挿入</li>
        <li><strong>文字右クリック</strong> — 削除</li>
        <li><I><MoreVertical size={14} /></I> メニューからキャラクター追加、パレット管理、インポート/エクスポート (.aapal/.aapals)</li>
      </ul>

      <h2>ライブラリ (MLT)</h2>
      <ul>
        <li><I><FolderOpen size={14} /></I> — ディレクトリ選択</li>
        <li><I><RefreshCw size={14} /></I> — 更新</li>
        <li><strong>ドロップダウン1</strong> — MLTファイル選択</li>
        <li><strong>ドロップダウン2</strong> — セクション選択</li>
        <li><strong>AAクリック</strong> — レイヤーとして挿入</li>
        <li><strong>AAマウスオーバー</strong> — 大きなプレビューポップアップ表示</li>
      </ul>

      <h2>合成結果</h2>
      <ul>
        <li><I><Copy size={14} /></I> コピー / <I><Download size={14} /></I> エクスポート</li>
        <li><I><PanelBottom size={14} /></I>/<I><PanelRight size={14} /></I> 位置切替 / <I><ExternalLink size={14} /></I> 別ウィンドウ</li>
      </ul>

      <h2>ショートカット一覧</h2>
      <table className={styles.shortcutTable}>
        <thead><tr><th>ショートカット</th><th>機能</th></tr></thead>
        <tbody>
          <tr><td><K>Ctrl+N</K></td><td>新規ドキュメント</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>ドキュメントを閉じる</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>閉じたドキュメントを復元</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>開く</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>保存</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>名前を付けて保存</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>元に戻す</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K></td><td>やり直し</td></tr>
          <tr><td><K>Ctrl+C</K>/<K>V</K></td><td>コピー/貼り付け</td></tr>
          <tr><td><K>Escape</K></td><td>モードキャンセル / 選択解除</td></tr>
          <tr><td><K>Space</K></td><td>ドット文字サイクル入力</td></tr>
        </tbody>
      </table>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 영어 매뉴얼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ManualEn() {
  return (
    <>
      <h2>Overview</h2>
      <p>KawAAi is a specialized editor for Japanese AA (ASCII Art / Yaruo). It uses proportional fonts (MS PGothic / Saitamaar) and layer-based compositing.</p>

      <h2>Layout</h2>
      <ul>
        <li><strong>Header Toolbar</strong> — File, layer tools, view settings</li>
        <li><strong>Document Tabs</strong> — Multi-document switching</li>
        <li><strong>Left Panel</strong> — Layers, palette, MLT library</li>
        <li><strong>Canvas</strong> — AA editing area</li>
        <li><strong>Preview Panel</strong> — Composite result</li>
      </ul>

      <h2>File Management</h2>
      <ul>
        <li><I><FolderOpen size={14} /></I> <strong>Open</strong> (<K>Ctrl+O</K>)</li>
        <li><I><Save size={14} /></I> <strong>Save</strong> (<K>Ctrl+S</K>) / Save As (<K>Ctrl+Shift+S</K>)</li>
        <li><strong>Auto Save</strong> — Configurable interval in settings</li>
      </ul>
      <h3>File Formats</h3>
      <ul>
        <li><strong>.aaproj</strong> — Project file (all documents)</li>
        <li><strong>.aapal</strong> — Palette / <strong>.aapals</strong> — Palette set</li>
      </ul>

      <h2>Document Tabs</h2>
      <ul>
        <li><K>Ctrl+N</K> — New document</li>
        <li><K>Ctrl+W</K> — Close document (minimum 1 kept)</li>
        <li><K>Ctrl+Shift+T</K> — Reopen closed document</li>
        <li><strong>Double-click</strong> — Rename document</li>
        <li>Click tab then <K>Ctrl+C</K>/<K>Ctrl+V</K> — Copy/paste document</li>
      </ul>

      <h2>Layers</h2>
      <ul>
        <li><I><Plus size={14} /></I> Add text layer / <I><Image size={14} /></I> Add image layer (reference only)</li>
        <li><I><GripVertical size={14} /></I> Drag to reorder</li>
        <li><I><Lock size={14} /></I>/<I><Unlock size={14} /></I> Lock / <I><Eye size={14} /></I>/<I><EyeOff size={14} /></I> Visibility / <I><Trash2 size={14} /></I> Delete</li>
        <li><I><Merge size={14} /></I> Merge selected text layers (2+)</li>
        <li><K>Ctrl</K>+click: multi-select, <K>Shift</K>+click: range select</li>
      </ul>

      <h2>Opaque Paint</h2>
      <p>Mark whitespace as opaque so lower layers don't bleed through.</p>
      <ul>
        <li><I><Paintbrush size={14} /></I> Paint mode — drag to mark (shown in yellow)</li>
        <li><I><Eraser size={14} /></I> Erase mode — drag to remove markings</li>
        <li><I><X size={14} /></I> or <K>Escape</K> to cancel mode</li>
      </ul>

      <h2>Text Editing</h2>
      <ul>
        <li><strong>Spacebar</strong> — Dot character cycling. Hair Space → Thin Space → ... 9 stages.</li>
      </ul>

      <h2>Layer Canvas (Quick Edit)</h2>
      <p><I><PenTool size={14} /></I> opens a modal for composing AA with an image reference, then inserts as a layer.</p>

      <h2>Palette</h2>
      <ul>
        <li><strong>Click character</strong> — Insert at cursor position in active layer</li>
        <li><strong>Right-click character</strong> — Delete</li>
        <li><I><MoreVertical size={14} /></I> menu for adding characters, managing palettes, import/export (.aapal/.aapals)</li>
      </ul>

      <h2>Library (MLT)</h2>
      <ul>
        <li><I><FolderOpen size={14} /></I> — Select directory</li>
        <li><I><RefreshCw size={14} /></I> — Refresh</li>
        <li><strong>Dropdown 1</strong> — Select MLT file</li>
        <li><strong>Dropdown 2</strong> — Select section</li>
        <li><strong>Click AA</strong> — Insert as layer</li>
        <li><strong>Hover AA</strong> — Large preview popup</li>
      </ul>

      <h2>Composite Result</h2>
      <ul>
        <li><I><Copy size={14} /></I> Copy / <I><Download size={14} /></I> Export as .txt</li>
        <li><I><PanelBottom size={14} /></I>/<I><PanelRight size={14} /></I> Position / <I><ExternalLink size={14} /></I> Detach</li>
      </ul>

      <h2>Keyboard Shortcuts</h2>
      <table className={styles.shortcutTable}>
        <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td><K>Ctrl+N</K></td><td>New document</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>Close document</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>Reopen closed document</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>Open</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>Save</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>Save As</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>Undo</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K></td><td>Redo</td></tr>
          <tr><td><K>Ctrl+C</K>/<K>V</K></td><td>Copy/Paste layers (tab focus: documents)</td></tr>
          <tr><td><K>Escape</K></td><td>Cancel mode / Deselect</td></tr>
          <tr><td><K>Space</K></td><td>Dot character cycling</td></tr>
        </tbody>
      </table>
    </>
  );
}
