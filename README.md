# AiPDF

A desktop PDF viewer with built-in AI chat, powered by Tauri 2, React, and Rust. Open PDFs, navigate pages, extract text, and ask questions about your documents using local ONNX models or cloud-based OpenAI-compatible APIs.

## Features

- **PDF Viewing** — Open, render, and navigate multi-page PDFs with zoom controls
- **Text Extraction** — Extract per-page text with character-level position data
- **AI Chat** — Ask questions about your PDF in a side panel with markdown-rendered responses
- **PDF Context** — Select text from the PDF to use as context in AI prompts
- **Local Models** — Load ONNX models from `~/.aipdf/models/` with tokenizer support
- **Cloud Models** — Connect to any OpenAI-compatible API (OpenAI, Groq, Together, etc.)
- **Model Manager** — Download, delete, load/unload local models; add, test, and switch cloud models
- **Resizable Layout** — Three-panel layout (sidebar, viewer, chat) with draggable separators
- **Cross-Platform** — macOS (universal), Windows (x64), Linux (x64)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | [Tauri 2](https://v2.tauri.app/) |
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| State management | Zustand |
| PDF rendering | [pdfium-render](https://github.com/ajrcarey/pdfium-render) (bundled Pdfium) |
| Local AI inference | [ort](https://github.com/pykeio/ort) (ONNX Runtime) |
| Tokenization | [tokenizers](https://github.com/huggingface/tokenizers) |
| Cloud AI | reqwest (OpenAI-compatible chat completions) |

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+) and a package manager (npm, pnpm, or bun)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```sh
# Install frontend dependencies
npm install

# Download bundled Pdfium binaries
bash scripts/fetch-pdfium.sh

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
aipdf-tauri/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── ChatPanel.tsx       # AI chat interface
│   │   ├── ModelManager.tsx    # Local & cloud model management dialog
│   │   ├── PageSidebar.tsx     # Page thumbnail navigation
│   │   ├── PdfViewer.tsx       # PDF page renderer
│   │   ├── Toolbar.tsx         # Top toolbar (open, navigate, zoom, toggles)
│   │   ├── WelcomeScreen.tsx   # Landing screen when no PDF is open
│   │   └── ui/                 # Reusable UI primitives (Radix-based)
│   ├── hooks/
│   │   ├── useAi.ts            # AI invoke wrappers & event listeners
│   │   └── usePdf.ts           # PDF invoke wrappers & navigation logic
│   ├── store.ts                # Zustand global state
│   ├── App.tsx                 # Root layout with resizable panels
│   └── main.tsx                # React entry point
├── src-tauri/                  # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── ai.rs           # AI Tauri commands (load, generate, cloud, etc.)
│   │   │   └── pdf.rs          # PDF Tauri commands (open, render, text, etc.)
│   │   ├── ai/
│   │   │   ├── session.rs      # ONNX Runtime session management
│   │   │   ├── tokenizer.rs    # HuggingFace tokenizer wrapper
│   │   │   └── inference.rs    # Inference logic
│   │   ├── models/
│   │   │   ├── registry.rs     # Model discovery in ~/.aipdf/models/
│   │   │   └── downloader.rs   # HuggingFace model downloader with progress
│   │   ├── pdf/
│   │   │   ├── document.rs     # PdfFile wrapper around pdfium-render
│   │   │   ├── renderer.rs     # Page-to-image rendering
│   │   │   └── text.rs         # Text extraction with character positions
│   │   ├── state.rs            # AppState (PDF + AI mutex-protected state)
│   │   ├── lib.rs              # Tauri plugin & command registration
│   │   └── main.rs             # Desktop entry point
│   ├── resources/pdfium/       # Bundled Pdfium shared libraries
│   └── Cargo.toml              # Rust dependencies
├── scripts/
│   └── fetch-pdfium.sh         # Download Pdfium binaries for all platforms
└── package.json                # Frontend dependencies & scripts
```

## Bundled Pdfium

The app bundles Pdfium so PDF rendering does not depend on a system install:

| Platform | Path | Architecture |
|----------|------|-------------|
| macOS | `src-tauri/resources/pdfium/libpdfium.dylib` | universal (x86_64 + arm64) |
| Windows | `src-tauri/resources/pdfium/pdfium.dll` | x86_64 |
| Linux | `src-tauri/resources/pdfium/libpdfium.so` | x86_64 |

Refresh the bundled binaries with:

```sh
bash scripts/fetch-pdfium.sh
```

To verify a target is self-contained, build that platform and confirm the generated bundle contains `pdfium/<platform library name>` in the Tauri resource directory. The Rust loader prefers the bundled resource path and only falls back to a system Pdfium install if the bundled library is missing.

## AI Models

### Local Models

Local models are stored in `~/.aipdf/models/<model-id>/` and require:

- `model.onnx` — The ONNX model file
- `tokenizer.json` — HuggingFace tokenizer
- `config.json` — Model metadata (optional)

Download models from HuggingFace via the Model Manager UI or place them manually.

### Cloud Models

Cloud models connect to any OpenAI-compatible chat completions API. Configure in the Model Manager with:

- **Base URL** — e.g., `https://api.openai.com`
- **API Key** — Your provider's API key
- **Model** — Model identifier (e.g., `gpt-4.1-mini`)

Cloud model configs are persisted in browser localStorage.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | Type-check and build frontend |
| `npm run tauri dev` | Run app in development mode |
| `npm run tauri build` | Build production bundle |
| `bash scripts/fetch-pdfium.sh` | Download/update bundled Pdfium binaries |

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
