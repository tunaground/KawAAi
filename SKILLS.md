# SKILLS.md

Claude Code가 반복 작업 시 참조하는 프로시저 모음.

## 기능 추가/변경/삭제 시 체크리스트

기능을 추가, 변경, 삭제할 때 아래 항목을 반드시 함께 처리한다.

### 1. i18n (3개 언어 동시)

UI에 표시되는 문자열은 하드코딩하지 않고 i18n 키를 사용한다.

- `src/i18n/ko.ts`
- `src/i18n/ja.ts`
- `src/i18n/en.ts`

3개 파일에 키를 동시에 추가/수정/삭제. 코드에서는 `t("key")` 사용.

### 2. 매뉴얼 (3개 언어 동시)

`src/components/modals/ManualModal.tsx` 내부의 3개 함수를 모두 업데이트:

- `ManualKo()` — 한국어
- `ManualJa()` — 일본어
- `ManualEn()` — 영어

단축키 추가, UI 버튼 변경, 기능 추가/삭제 모두 해당.

### 3. README.md (필요 시)

사용자에게 노출되는 주요 기능 변경일 경우 `README.md`도 업데이트.
내부 리팩터링이나 버그 수정은 불필요.

## 버전 릴리즈

새 버전을 릴리즈할 때 아래 순서를 반드시 따른다.

### 1. 버전 번호 업데이트 (3곳)

| 파일 | 위치 |
|------|------|
| `package.json` | `"version": "x.x.x"` |
| `src-tauri/tauri.conf.json` | `"version": "x.x.x"` |
| `src/components/layout/Header.tsx` | `<span className={styles.version}>vx.x.x</span>` |

### 2. 커밋

```
git add -A
git commit -m "chore: vX.X.X 버전 업"
```

### 3. 태그 생성 + 푸시

```
git tag vX.X.X
git push && git push --tags
```

태그가 push되면 `.github/workflows/release.yml`이 자동으로:
- macOS (aarch64, x86_64) + Windows 빌드
- GitHub Release 생성 + 바이너리 첨부

### 주의사항

- 태그 형식은 반드시 `v`로 시작 (예: `v0.4.0`)
- 커밋 먼저 push한 뒤 태그를 push해도 되고, 동시에 push해도 됨
- 릴리즈 노트는 GitHub Actions가 기본 템플릿을 사용. 상세 내용이 필요하면 릴리즈 후 GitHub에서 수정
