# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KawAAi is a layer-based Japanese AA (ASCII Art) editor desktop app built with Tauri v2 (Rust backend) + React 19 + TypeScript + Zustand. It enables creating AA art using proportional fonts (MS PGothic, Saitamaar) with pixel-based composition.

## Development Commands

```bash
npm install                  # Install frontend dependencies
npm run tauri dev            # Run full desktop app (frontend + Rust backend)
npm run dev                  # Frontend-only dev server (http://localhost:1420)
npm run build                # TypeScript check + Vite build (frontend only)
npm run tauri build          # Production desktop build (DMG/MSI)
npx tsc --noEmit             # Type check without emitting
```

Rust backend is in `src-tauri/` — Cargo builds are handled automatically by the Tauri CLI.

## Architecture

**Frontend (src/):** React 19 app with Zustand state management.

- **stores/**: 4 Zustand stores — `projectStore` (layers, documents, canvas, fontSize, lineHeight, guides), `configStore` (theme, preview, auto-save), `mltStore`, `paletteStore`
- **lib/compositor.ts**: Core composition engine — pixel-based layer rendering with transparent/opaque handling. fontSize/lineHeight 파라미터 대응.
- **lib/fontMetrics.ts**: Character width calculation. fontSize별 측정 컨텍스트 캐시. `deriveLineHeight()` 헬퍼.
- **lib/dotInput.ts**: Space-width cycling (16단계 + Em Space 누적)
- **lib/spaceOptimizer.ts**: Em Space(U+2003) 압축 최적화 + opaqueRanges 보정
- **lib/layerOps.ts**: Layer merge operations
- **lib/mltParser.ts / mltExporter.ts**: MLT file parsing and export
- **lib/fileIO.ts**: Wrappers around Tauri `invoke()` commands for file operations
- **components/**: layout/ (Header, TabBar, NamespaceBar, StatusBar, CanvasSettingsPopover), panels/ (LeftPanel, PreviewPanel, MltSection, PaletteSection, PanelResize, LayerItem), canvas/ (Canvas, LayerBox), modals/ (Input, QuickEdit, Settings, Manual)
- **hooks/**: useKeyboardShortcuts, useDragHandler, useAutoSave
- **i18n/**: Zustand-based i18n with 3 languages (ko, ja, en). Use `useI18n().t("key")` in components, `t("key")` outside.

**Backend (src-tauri/src/lib.rs):** Rust Tauri commands for file I/O, config persistence, palette/MLT management. All commands use `#[tauri::command]` and are invoked from the frontend via `@tauri-apps/api`.

## Key Conventions

- UI text and README are primarily in Korean. Code and comments are in English.
- TypeScript strict mode is enforced — no unused variables or parameters allowed.
- File formats: `.aaproj` (project), `.aadoc` (document), `.aapal`/`.aapals` (palette), `.mlt` (library, read-only).
- CI builds target macOS (aarch64 + x86_64) and Windows via GitHub Actions (`.github/workflows/release.yml`).
- Document 타입에 `fontSize`, `lineHeight`, `guides` 필드가 있으며 문서별로 독립 관리. 구 프로젝트 로드 시 `App.tsx`의 `migrateProjectData()`에서 기본값 적용.

## Procedures

**반복 작업 프로시저는 `SKILLS.md`를 반드시 참조.** 기능 추가/변경 시 i18n, 매뉴얼, README 동시 업데이트 규칙과 버전 릴리즈 절차가 정의되어 있음.
