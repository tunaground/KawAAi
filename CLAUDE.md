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

- **stores/**: 6 Zustand stores — `projectStore` (layers, documents, canvas), `editorStore` (mode/selection), `configStore` (theme, preview, auto-save), `mltStore`, `paletteStore`, `statusStore`
- **lib/compositor.ts**: Core composition engine — pixel-based layer rendering with transparent/opaque handling. Most critical business logic.
- **lib/fileIO.ts**: Wrappers around Tauri `invoke()` commands for file operations
- **lib/dotInput.ts**: Space-width cycling for precise AA character spacing
- **lib/fontMetrics.ts**: Character width calculation for proportional fonts
- **components/**: layout/ (Header, TabBar, StatusBar), panels/ (LeftPanel, PreviewPanel, MltSection, PaletteSection), canvas/ (Canvas, LayerBox), modals/ (Input, QuickEdit, Settings, Manual)
- **hooks/**: useKeyboardShortcuts, useDragHandler, useAutoSave
- **i18n/**: Zustand-based i18n with 3 languages (ko, ja, en). Use `useI18n().t("key")` in components, `t("key")` outside.

**Backend (src-tauri/src/lib.rs):** Rust Tauri commands for file I/O, config persistence, palette/MLT management. All commands use `#[tauri::command]` and are invoked from the frontend via `@tauri-apps/api`.

## Key Conventions

- UI text and README are primarily in Korean. Code and comments are in English.
- All three i18n files (ko.ts, ja.ts, en.ts) must stay in sync when adding UI strings.
- TypeScript strict mode is enforced — no unused variables or parameters allowed.
- File formats: `.aaproj` (project), `.aadoc` (document), `.aapal`/`.aapals` (palette), `.mlt` (library, read-only).
- CI builds target macOS (aarch64 + x86_64) and Windows via GitHub Actions.
