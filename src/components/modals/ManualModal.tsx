import {
  X, FolderOpen, Save, Merge, PenTool, Paintbrush,
  Magnet, Grid3x3, LetterText, Settings, Plus, Image,
  GripVertical, Lock, Unlock, Eye, EyeOff, Trash2,
  Copy, Download, PanelBottom, PanelRight, ExternalLink,
  ChevronsRight, ChevronsLeft, MoreVertical, RefreshCw,
  BookOpen, FileDown, FilePlus, Scaling, Ruler, Minus, Minimize2,
  BoxSelect, Square, Brush, PaintBucket, SlidersHorizontal,
  PaintbrushVertical, Stamp,
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
        <li><I><FilePlus size={14} /></I> <strong>새 프로젝트</strong> (<K>Ctrl+P</K>) — 새 프로젝트 생성</li>
        <li><I><FolderOpen size={14} /></I> <strong>열기</strong> (<K>Ctrl+O</K>) — 프로젝트 파일(.aaproj) 열기</li>
        <li><I><Save size={14} /></I> <strong>저장</strong> (<K>Ctrl+S</K>) — 현재 프로젝트 저장. 처음 저장 시 경로 선택</li>
        <li><strong>다른 이름으로 저장</strong> (<K>Ctrl+Shift+S</K>) — 새 경로에 저장</li>
        <li><strong>자동 저장</strong> — 설정에서 간격 지정 (안함/30초/1분/3분/5분/10분). 파일이 저장된 적 있는 경우에만 동작</li>
        <li><I><FileDown size={14} /></I> <strong>MLT 익스포트</strong> — 프로젝트를 MLT 파일로 내보내기. 네임스페이스가 섹션 헤더가 됨</li>
      </ul>
      <h3>파일 형식</h3>
      <ul>
        <li><strong>.aaproj</strong> — 프로젝트 파일 (모든 문서 포함)</li>
        <li><strong>.aadoc</strong> — 문서 단위 내보내기/가져오기</li>
        <li><strong>.aapal</strong> — 단일 팔레트</li>
        <li><strong>.aapals</strong> — 팔레트세트</li>
        <li><strong>.mlt</strong> — MLT 라이브러리 (익스포트 가능)</li>
      </ul>

      <h2>네임스페이스</h2>
      <p>네임스페이스는 문서를 그룹으로 묶는 단위입니다. MLT 익스포트 시 섹션 헤더로 사용됩니다.</p>
      <ul>
        <li><K>Ctrl+N</K> — 새 네임스페이스 추가</li>
        <li><K>Ctrl+Shift+N</K> — 삭제된 네임스페이스 복원</li>
        <li><strong>더블클릭</strong> — 이름 변경</li>
        <li><strong>드래그</strong> — 순서 변경</li>
        <li>문서 탭을 네임스페이스 탭으로 드래그하여 이동</li>
        <li>최소 1개 네임스페이스, 각 네임스페이스는 최소 1개 문서 유지</li>
      </ul>

      <h2>문서 탭</h2>
      <ul>
        <li><K>Ctrl+T</K> — 새 문서 추가</li>
        <li><K>Ctrl+W</K> — 현재 문서 닫기</li>
        <li><K>Ctrl+Shift+T</K> — 삭제된 문서 복원</li>
        <li><strong>더블클릭</strong> — 문서 이름 변경</li>
        <li><strong>드래그</strong> — 순서 변경</li>
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
      <h3>스페이스 압축</h3>
      <p><I><Minimize2 size={14} /></I> 선택된 텍스트 레이어의 연속 공백을 Em Space(U+2003)로 압축하여 캐릭터 수를 절약합니다. 16px 이상의 연속 공백 구간이 대상입니다.</p>

      <h2>캔버스</h2>
      <ul>
        <li><strong>캔버스 크기 조절</strong> — 캔버스 우하단 모서리 드래그 (잠금 시 비활성)</li>
        <li><strong>레이어 이동</strong> — 레이어 우상단 삼각형 핸들 드래그</li>
        <li><strong>레이어 크기 조절</strong> — 레이어 우하단 삼각형 핸들 드래그</li>
      </ul>
      <h3>캔버스 설정</h3>
      <p><I><Scaling size={14} /></I> 버튼으로 캔버스 설정 팝오버를 엽니다. 설정은 문서별로 독립 저장됩니다.</p>
      <ul>
        <li><strong>프리셋</strong> — 디스플레이 해상도별 캔버스 크기 프리셋 (모바일/태블릿/데스크탑)</li>
        <li><strong>너비/높이</strong> — 가용영역 기준 캔버스 크기 (px 단위 직접 입력)</li>
        <li><strong>캔버스 크기 잠금</strong> — 체크 시 드래그 리사이즈 비활성화</li>
        <li><strong>폰트 크기</strong> — 캔버스 텍스트 폰트 크기 (px)</li>
        <li><strong>행간</strong> — 줄 간격 (px). 잠금 시 폰트 크기에 비례하여 자동 조정, 해제 시 독립 조정 가능</li>
      </ul>
      <h3>눈금자 / 가이드</h3>
      <ul>
        <li><I><Ruler size={14} /></I> <strong>눈금자 단위</strong> — px/mm 전환. 버튼 우하단에 현재 단위 표시</li>
        <li><strong>커스텀 가이드 선</strong> — 상단 룰러에서 좌우 드래그로 세로 가이드, 좌측 룰러에서 상하 드래그로 가로 가이드 생성. 드래그 중 위치(px/mm) 표시. 룰러에서 기존 가이드를 드래그하여 이동, 룰러 밖으로 드래그하여 제거</li>
      </ul>
      <h3>뷰 설정</h3>
      <ul>
        <li><I><Magnet size={14} /></I> <strong>스냅</strong> — 레이어 위치/크기를 그리드에 맞춤</li>
        <li><I><Grid3x3 size={14} /></I> <strong>그리드</strong> — 캔버스에 격자선 표시</li>
        <li><I><LetterText size={14} /></I> <strong>문자 그리드</strong> — 문자마다 빨강/파랑 배경을 교차 표시</li>
      </ul>

      <h2>텍스트 편집</h2>
      <ul>
        <li><K>Shift+Space</K> — 도트 문자 순환 입력. 누를 때마다 Hair Space → Thin Space → ... 점점 넓은 공백으로 교체. 16단계 1사이클.</li>
        <li><strong>Space</strong> — 일반 공백 삽입</li>
      </ul>

      <h2>블록 편집</h2>
      <p>활성 텍스트 레이어 내에서 문자 단위로 영역을 선택하고 액션을 적용합니다.</p>
      <h3>하단 툴바</h3>
      <ul>
        <li><I><BoxSelect size={14} /></I> <strong>블록 편집 활성화</strong> — 토글 버튼</li>
        <li><I><Square size={14} /></I> <strong>사각 선택</strong> — 드래그로 사각 영역 선택</li>
        <li><I><Brush size={14} /></I> <strong>브러시 선택</strong> — 클릭+드래그로 개별 문자 선택. 호버 시 가이드 표시</li>
        <li><I><Paintbrush size={14} /></I> <strong>채색 적용</strong> — 선택 영역을 공백 불투명으로 마킹</li>
        <li><I><PaintbrushVertical size={14} /></I> <strong>채색 제거</strong> — 선택 영역의 불투명 마킹 해제</li>
        <li><I><PaintBucket size={14} /></I> <strong>박스 자동 채색</strong> — 박스 생성 시 자동으로 불투명 처리</li>
      </ul>
      <h3>선택 수정자</h3>
      <ul>
        <li><strong>드래그</strong> — 새 선택 (기존 교체)</li>
        <li><K>Shift</K>+드래그 — 기존 선택에 추가</li>
        <li><K>Ctrl</K>+<K>Shift</K>+드래그 — 기존 선택에서 제거</li>
        <li><K>Escape</K> — 선택 해제 → 모드 해제</li>
      </ul>

      <h2>레이어 캔버스 (간이 편집)</h2>
      <p><I><PenTool size={14} /></I> 버튼으로 모달을 열고, 이미지를 참고하면서 AA를 작성한 뒤 레이어로 삽입합니다.</p>
      <ul>
        <li><strong>이미지 불러오기</strong> — 참고 이미지 로드. 크기/투명도 조절 가능. 우상단 핸들로 위치 이동.</li>
        <li><strong>편집창 크기 조절</strong> — 우하단 핸들 드래그</li>
        <li><strong>글씨색</strong> — 색상 선택</li>
        <li><strong>레이어로 삽입</strong> — 작성한 텍스트를 현재 문서에 새 레이어로 추가</li>
      </ul>

      <h2>레이어 속성</h2>
      <ul>
        <li><I><SlidersHorizontal size={14} /></I> — 레이어 아이템의 속성 버튼 클릭 시 팝오버 표시</li>
        <li><strong>텍스트 레이어</strong> — 투명도 조절</li>
        <li><strong>이미지 레이어</strong> — 투명도 + 채도 조절</li>
      </ul>

      <h2>팔레트</h2>
      <p>자주 사용하는 AA 문자와 박스 프리셋을 팔레트에 등록합니다. 캐릭터 팔레트와 박스 팔레트를 드롭다운에서 전환합니다.</p>
      <h3>캐릭터 팔레트</h3>
      <ul>
        <li><strong>클릭</strong> — 선택 (<K>Ctrl</K>/&zwj;<K>Shift</K>+클릭으로 다중 선택)</li>
        <li><strong>더블클릭</strong> — 활성 레이어의 커서 위치에 삽입</li>
      </ul>
      <h3>박스 팔레트</h3>
      <ul>
        <li><strong>클릭</strong> — 박스 활성화 (캔버스 드래그 생성 모드 진입)</li>
        <li><K>Ctrl</K>/<K>Shift</K>+클릭 — 다중 선택 (활성화 해제)</li>
        <li>활성 상태에서 캔버스 드래그 → 박스 텍스트 레이어 생성</li>
        <li>드래그 중 <K>Escape</K> — 생성 취소 (박스 선택 유지)</li>
      </ul>
      <h3>메뉴</h3>
      <ul>
        <li><I><MoreVertical size={14} /></I> 메뉴:
          <ul>
            <li><strong>캐릭터 팔레트</strong>: 캐릭터 추가, 선택 삭제</li>
            <li><strong>박스 팔레트</strong>: 박스 추가/편집, 선택 삭제</li>
            <li><strong>스탬프 팔레트</strong>: 여러 줄 AA 텍스트를 저장하여 캔버스 클릭으로 삽입</li>
            <li>캐릭터/박스/스탬프 팔레트 추가, 팔레트 삭제</li>
            <li>팔레트 임포트/익스포트 (.aapal), 세트 임포트/익스포트 (.aapals)</li>
          </ul>
        </li>
      </ul>
      <h3>스탬프</h3>
      <ul>
        <li><strong>클릭</strong> — 스탬프 활성화 → 캔버스 클릭으로 레이어 삽입. 호버 시 미리보기 표시</li>
        <li><I><Stamp size={14} /></I> <strong>문서를 스탬프로 저장</strong> — 상단 툴바 저장 버튼 옆. 스탬프 팔레트 선택 시 활성화. 현재 문서 합성 결과를 스탬프로 저장</li>
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
        <li><I><Minus size={14} /></I> / <strong>숫자 입력</strong> / <I><Plus size={14} /></I> — 프리뷰 폰트 크기 조절 (캔버스 행간 비율 반영)</li>
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
          <tr><td><K>Ctrl+N</K></td><td>새 네임스페이스</td></tr>
          <tr><td><K>Ctrl+Shift+N</K></td><td>삭제된 네임스페이스 복원</td></tr>
          <tr><td><K>Ctrl+T</K></td><td>새 문서</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>문서 닫기</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>삭제된 문서 복원</td></tr>
          <tr><td><K>Ctrl+P</K></td><td>새 프로젝트</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>열기</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>저장</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>다른 이름으로 저장</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>되돌리기</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K> / <K>Ctrl+Y</K></td><td>다시 실행</td></tr>
          <tr><td><K>Ctrl+C</K></td><td>레이어 복사 (탭 포커스: 문서 복사)</td></tr>
          <tr><td><K>Ctrl+V</K></td><td>레이어 붙여넣기 (탭 포커스: 문서 붙여넣기)</td></tr>
          <tr><td><K>Delete</K> / <K>Backspace</K></td><td>선택된 레이어 삭제</td></tr>
          <tr><td><K>Escape</K></td><td>박스/팔레트 해제 → 블록 선택 해제 → 모드 해제 → 레이어 선택 해제</td></tr>
          <tr><td><K>Shift+Space</K></td><td>도트 문자 순환 입력</td></tr>
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
        <li><I><FilePlus size={14} /></I> <strong>新規プロジェクト</strong> (<K>Ctrl+P</K>)</li>
        <li><I><FolderOpen size={14} /></I> <strong>開く</strong> (<K>Ctrl+O</K>)</li>
        <li><I><Save size={14} /></I> <strong>保存</strong> (<K>Ctrl+S</K>) / 名前を付けて保存 (<K>Ctrl+Shift+S</K>)</li>
        <li><strong>自動保存</strong> — 設定で間隔指定</li>
      </ul>
      <h3>ファイル形式</h3>
      <ul>
        <li><strong>.aaproj</strong> — プロジェクトファイル（全ドキュメント含む）</li>
        <li><strong>.aapal</strong> — パレット / <strong>.aapals</strong> — パレットセット</li>
        <li><strong>.mlt</strong> — MLTライブラリ（エクスポート可能）</li>
      </ul>

      <h2>ネームスペース</h2>
      <p>ネームスペースはドキュメントをグループ化する単位です。MLTエクスポート時にセクションヘッダーになります。</p>
      <ul>
        <li><K>Ctrl+N</K> — 新規ネームスペース</li>
        <li><K>Ctrl+Shift+N</K> — 削除したネームスペースを復元</li>
        <li><strong>ダブルクリック</strong> — 名前変更</li>
        <li><strong>ドラッグ</strong> — 順序変更</li>
        <li>ドキュメントタブをネームスペースタブにドラッグして移動</li>
      </ul>

      <h2>ドキュメントタブ</h2>
      <ul>
        <li><K>Ctrl+T</K> — 新規ドキュメント</li>
        <li><K>Ctrl+W</K> — ドキュメントを閉じる</li>
        <li><K>Ctrl+Shift+T</K> — 削除したドキュメントを復元</li>
        <li><strong>ダブルクリック</strong> — ドキュメント名変更</li>
        <li><strong>ドラッグ</strong> — 順序変更</li>
        <li>タブクリック後 <K>Ctrl+C</K>/<K>Ctrl+V</K> — ドキュメントコピー/貼り付け</li>
      </ul>

      <h2>レイヤー</h2>
      <ul>
        <li><I><Plus size={14} /></I> テキストレイヤー追加 / <I><Image size={14} /></I> 画像レイヤー追加</li>
        <li><I><GripVertical size={14} /></I> ドラッグで順序変更</li>
        <li><I><Lock size={14} /></I>/<I><Unlock size={14} /></I> ロック / <I><Eye size={14} /></I>/<I><EyeOff size={14} /></I> 表示 / <I><Trash2 size={14} /></I> 削除</li>
        <li><I><Merge size={14} /></I> レイヤー結合（2つ以上選択）</li>
        <li><I><Minimize2 size={14} /></I> <strong>スペース圧縮</strong> — 選択レイヤーの連続空白をEm Space(U+2003)に圧縮してキャラクター数を節約（16px以上の区間が対象）</li>
        <li><K>Ctrl</K>+クリック: 複数選択、<K>Shift</K>+クリック: 範囲選択</li>
      </ul>

      <h2>キャンバス設定</h2>
      <p><I><Scaling size={14} /></I> ボタンでキャンバス設定ポップオーバーを開きます。設定はドキュメント単位で保存されます。</p>
      <ul>
        <li><strong>プリセット</strong> — ディスプレイ解像度別キャンバスサイズプリセット</li>
        <li><strong>幅/高さ</strong> — 使用可能領域基準キャンバスサイズ（px単位）</li>
        <li><strong>キャンバスサイズ固定</strong> — ドラッグリサイズ無効化</li>
        <li><strong>フォントサイズ</strong> — テキストフォントサイズ（px）</li>
        <li><strong>行間</strong> — 行間隔（px）。ロック時フォントサイズに連動、解除時独立調整可能</li>
      </ul>
      <h3>ルーラー / ガイド</h3>
      <ul>
        <li><I><Ruler size={14} /></I> <strong>ルーラー単位</strong> — px/mm切替</li>
        <li><strong>カスタムガイド線</strong> — 上ルーラーで左右ドラッグ→縦ガイド、左ルーラーで上下ドラッグ→横ガイド。ルーラーでドラッグして移動、ルーラー外にドラッグして削除</li>
      </ul>

      <h2>ブロック編集</h2>
      <p>アクティブテキストレイヤー内で文字単位で領域を選択しアクションを適用します。</p>
      <ul>
        <li><I><BoxSelect size={14} /></I> <strong>ブロック編集有効化</strong></li>
        <li><I><Square size={14} /></I> <strong>矩形選択</strong> / <I><Brush size={14} /></I> <strong>ブラシ選択</strong></li>
        <li><I><Paintbrush size={14} /></I> <strong>塗り適用</strong> / <I><PaintbrushVertical size={14} /></I> <strong>塗り消去</strong></li>
        <li><I><PaintBucket size={14} /></I> <strong>ボックス自動塗り</strong></li>
        <li><K>Shift</K>+ドラッグ — 追加選択 / <K>Ctrl+Shift</K>+ドラッグ — 選択解除</li>
        <li><K>Escape</K> — 選択解除 → モード解除</li>
      </ul>

      <h2>テキスト編集</h2>
      <ul>
        <li><K>Shift+Space</K> — ドット文字サイクル入力（16段階）</li>
        <li><strong>Space</strong> — 通常スペース入力</li>
      </ul>

      <h2>レイヤーキャンバス</h2>
      <p><I><PenTool size={14} /></I> ボタンでモーダルを開き、画像を参考にAAを作成してレイヤーとして挿入。</p>

      <h2>レイヤープロパティ</h2>
      <ul>
        <li><I><SlidersHorizontal size={14} /></I> — テキスト: 不透明度 / 画像: 不透明度+彩度</li>
      </ul>

      <h2>パレット</h2>
      <p>キャラクターパレットとボックスパレットをドロップダウンで切替。</p>
      <ul>
        <li><strong>キャラクター</strong>: クリックで選択、ダブルクリックで挿入</li>
        <li><strong>ボックス</strong>: クリックで有効化（キャンバスドラッグでボックス生成）</li>
        <li><strong>スタンプ</strong>: 複数行AAテキストを保存、クリックでレイヤー挿入。ホバーでプレビュー表示</li>
        <li><I><MoreVertical size={14} /></I> メニュー: キャラクター/ボックス/スタンプ追加・削除、パレット管理、インポート/エクスポート</li>
      </ul>
      <p><I><Stamp size={14} /></I> <strong>ドキュメントをスタンプとして保存</strong> — ヘッダーの保存ボタン横。スタンプパレット選択時に有効化</p>

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
        <li><I><Minus size={14} /></I> / 数値入力 / <I><Plus size={14} /></I> — プレビューフォントサイズ調整</li>
        <li><I><Copy size={14} /></I> コピー / <I><Download size={14} /></I> エクスポート</li>
        <li><I><PanelBottom size={14} /></I>/<I><PanelRight size={14} /></I> 位置切替 / <I><ExternalLink size={14} /></I> 別ウィンドウ</li>
      </ul>

      <h2>ショートカット一覧</h2>
      <table className={styles.shortcutTable}>
        <thead><tr><th>ショートカット</th><th>機能</th></tr></thead>
        <tbody>
          <tr><td><K>Ctrl+N</K></td><td>新規ネームスペース</td></tr>
          <tr><td><K>Ctrl+Shift+N</K></td><td>削除したネームスペースを復元</td></tr>
          <tr><td><K>Ctrl+T</K></td><td>新規ドキュメント</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>ドキュメントを閉じる</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>削除したドキュメントを復元</td></tr>
          <tr><td><K>Ctrl+P</K></td><td>新規プロジェクト</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>開く</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>保存</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>名前を付けて保存</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>元に戻す</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K></td><td>やり直し</td></tr>
          <tr><td><K>Ctrl+C</K>/<K>V</K></td><td>コピー/貼り付け</td></tr>
          <tr><td><K>Delete</K> / <K>Backspace</K></td><td>選択レイヤー削除</td></tr>
          <tr><td><K>Escape</K></td><td>ボックス/パレット解除 → ブロック選択解除 → モード解除 → レイヤー選択解除</td></tr>
          <tr><td><K>Shift+Space</K></td><td>ドット文字サイクル入力</td></tr>
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
        <li><I><FilePlus size={14} /></I> <strong>New Project</strong> (<K>Ctrl+P</K>)</li>
        <li><I><FolderOpen size={14} /></I> <strong>Open</strong> (<K>Ctrl+O</K>)</li>
        <li><I><Save size={14} /></I> <strong>Save</strong> (<K>Ctrl+S</K>) / Save As (<K>Ctrl+Shift+S</K>)</li>
        <li><strong>Auto Save</strong> — Configurable interval in settings</li>
        <li><I><FileDown size={14} /></I> <strong>Export MLT</strong> — Export project as MLT file. Namespaces become section headers</li>
      </ul>
      <h3>File Formats</h3>
      <ul>
        <li><strong>.aaproj</strong> — Project file (all documents)</li>
        <li><strong>.aapal</strong> — Palette / <strong>.aapals</strong> — Palette set</li>
        <li><strong>.mlt</strong> — MLT library (exportable)</li>
      </ul>

      <h2>Namespaces</h2>
      <p>Namespaces group documents. They become section headers when exporting to MLT.</p>
      <ul>
        <li><K>Ctrl+N</K> — New namespace</li>
        <li><K>Ctrl+Shift+N</K> — Reopen deleted namespace</li>
        <li><strong>Double-click</strong> — Rename</li>
        <li><strong>Drag</strong> — Reorder</li>
        <li>Drag document tabs onto namespace tabs to move</li>
      </ul>

      <h2>Document Tabs</h2>
      <ul>
        <li><K>Ctrl+T</K> — New document</li>
        <li><K>Ctrl+W</K> — Close document</li>
        <li><K>Ctrl+Shift+T</K> — Reopen closed document</li>
        <li><strong>Double-click</strong> — Rename document</li>
        <li><strong>Drag</strong> — Reorder</li>
        <li>Click tab then <K>Ctrl+C</K>/<K>Ctrl+V</K> — Copy/paste document</li>
      </ul>

      <h2>Layers</h2>
      <ul>
        <li><I><Plus size={14} /></I> Add text layer / <I><Image size={14} /></I> Add image layer (reference only)</li>
        <li><I><GripVertical size={14} /></I> Drag to reorder</li>
        <li><I><Lock size={14} /></I>/<I><Unlock size={14} /></I> Lock / <I><Eye size={14} /></I>/<I><EyeOff size={14} /></I> Visibility / <I><Trash2 size={14} /></I> Delete</li>
        <li><I><Merge size={14} /></I> Merge selected text layers (2+)</li>
        <li><I><Minimize2 size={14} /></I> <strong>Compress Spaces</strong> — Replace consecutive spaces (16px+) with Em Space (U+2003) to reduce character count</li>
        <li><K>Ctrl</K>+click: multi-select, <K>Shift</K>+click: range select</li>
      </ul>

      <h2>Canvas Settings</h2>
      <p><I><Scaling size={14} /></I> opens the canvas settings popover. Settings are saved per document.</p>
      <ul>
        <li><strong>Preset</strong> — Display resolution presets (mobile/tablet/desktop)</li>
        <li><strong>Width/Height</strong> — Canvas size in usable area (px)</li>
        <li><strong>Lock Canvas Size</strong> — Disables drag resize</li>
        <li><strong>Font Size</strong> — Canvas text font size (px)</li>
        <li><strong>Line Height</strong> — Line spacing (px). Locked: scales with font size. Unlocked: independent adjustment</li>
      </ul>
      <h3>Ruler / Guides</h3>
      <ul>
        <li><I><Ruler size={14} /></I> <strong>Ruler Unit</strong> — Toggle px/mm</li>
        <li><strong>Custom Guides</strong> — Drag left/right from top ruler for vertical guides, drag up/down from left ruler for horizontal guides. Drag on ruler to move, drag out of safe area to remove</li>
      </ul>

      <h2>Block Editing</h2>
      <p>Select character regions within the active text layer and apply actions.</p>
      <ul>
        <li><I><BoxSelect size={14} /></I> <strong>Enable Block Edit</strong></li>
        <li><I><Square size={14} /></I> <strong>Rectangle Select</strong> / <I><Brush size={14} /></I> <strong>Brush Select</strong> (hover guide)</li>
        <li><I><Paintbrush size={14} /></I> <strong>Apply Opaque</strong> / <I><PaintbrushVertical size={14} /></I> <strong>Remove Opaque</strong></li>
        <li><I><PaintBucket size={14} /></I> <strong>Box Auto Opaque</strong> — auto-opaque on box creation</li>
        <li><K>Shift</K>+drag — additive / <K>Ctrl+Shift</K>+drag — subtractive</li>
        <li><K>Escape</K> — clear selection → exit mode</li>
      </ul>

      <h2>Text Editing</h2>
      <ul>
        <li><K>Shift+Space</K> — Dot character cycling (16 stages)</li>
        <li><strong>Space</strong> — Normal space input</li>
      </ul>

      <h2>Layer Canvas (Quick Edit)</h2>
      <p><I><PenTool size={14} /></I> opens a modal for composing AA with an image reference, then inserts as a layer.</p>

      <h2>Layer Properties</h2>
      <ul>
        <li><I><SlidersHorizontal size={14} /></I> — Text layers: opacity / Image layers: opacity + saturation</li>
      </ul>

      <h2>Palette</h2>
      <p>Switch between character and box palettes via dropdown.</p>
      <ul>
        <li><strong>Character palette</strong>: click to select, double-click to insert</li>
        <li><strong>Box palette</strong>: click to activate (drag on canvas to create box layer)</li>
        <li><strong>Stamp palette</strong>: multi-line AA text, click to activate then click canvas to insert. Hover shows preview</li>
        <li><I><MoreVertical size={14} /></I> menu: add/delete characters, boxes, or stamps, palette management, import/export (.aapal/.aapals)</li>
      </ul>
      <p><I><Stamp size={14} /></I> <strong>Save Document as Stamp</strong> — next to Save button in header. Enabled when a stamp palette is selected</p>

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
        <li><I><Minus size={14} /></I> / number input / <I><Plus size={14} /></I> — Preview font size control (reflects canvas line height ratio)</li>
        <li><I><Copy size={14} /></I> Copy / <I><Download size={14} /></I> Export as .txt</li>
        <li><I><PanelBottom size={14} /></I>/<I><PanelRight size={14} /></I> Position / <I><ExternalLink size={14} /></I> Detach</li>
      </ul>

      <h2>Keyboard Shortcuts</h2>
      <table className={styles.shortcutTable}>
        <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td><K>Ctrl+N</K></td><td>New namespace</td></tr>
          <tr><td><K>Ctrl+Shift+N</K></td><td>Reopen deleted namespace</td></tr>
          <tr><td><K>Ctrl+T</K></td><td>New document</td></tr>
          <tr><td><K>Ctrl+W</K></td><td>Close document</td></tr>
          <tr><td><K>Ctrl+Shift+T</K></td><td>Reopen closed document</td></tr>
          <tr><td><K>Ctrl+P</K></td><td>New project</td></tr>
          <tr><td><K>Ctrl+O</K></td><td>Open</td></tr>
          <tr><td><K>Ctrl+S</K></td><td>Save</td></tr>
          <tr><td><K>Ctrl+Shift+S</K></td><td>Save As</td></tr>
          <tr><td><K>Ctrl+Z</K></td><td>Undo</td></tr>
          <tr><td><K>Ctrl+Shift+Z</K></td><td>Redo</td></tr>
          <tr><td><K>Ctrl+C</K>/<K>V</K></td><td>Copy/Paste layers (tab focus: documents)</td></tr>
          <tr><td><K>Delete</K> / <K>Backspace</K></td><td>Delete selected layers</td></tr>
          <tr><td><K>Escape</K></td><td>Box/palette clear → block clear → mode exit → layer deselect</td></tr>
          <tr><td><K>Shift+Space</K></td><td>Dot character cycling</td></tr>
        </tbody>
      </table>
    </>
  );
}
