# AiPDF: The Private, Performance-First AI PDF Workspace

AiPDF is a blazingly fast, privacy-focused desktop application that transforms how you interact with your documents. Built with **Rust**, **Tauri 2**, and **React**, it combines native performance with state-of-the-art local AI to give you a powerful research assistant that never leaks your data.

## 🚀 Why AiPDF?

- **⚡ Blazingly Fast Performance:** Leveraging Rust's memory safety and speed, AiPDF handles massive documents with ease. Native PDF rendering via `pdfium-render` ensures smooth navigation and instant text extraction.
- **🛡️ Privacy First (Offline-First):** Your data stays on your machine. All AI inference is performed locally using **ONNX Runtime**, meaning your sensitive documents never touch the cloud. No API keys required, no subscription needed.
- **🧠 Local Intelligence:** Powered by high-performance local models. Chat with your PDFs, summarize complex sections, and extract insights without compromising security.
- **📂 Intelligent Workspace Management:** Organize your research into logical workspaces. Move beyond single-file viewing to managing entire projects with ease.
- **🔍 Advanced RAG Pipeline:** Built-in Retrieval-Augmented Generation (RAG) using **LanceDB** (the ultra-fast vector database built on Apache Arrow) for pin-point accurate context retrieval during AI chats.

---

## ✨ Key Features

- **Interactive AI Chat:** Converse with your documents in real-time. Ask questions, get summaries, and dive deeper into technical details.
- **Visual Mindmaps:** (Experimental) Visualize document structures and relationships using interactive flow charts powered by **React Flow**.
- **High-Fidelity PDF Viewer:** Smooth scrolling, character-level text selection, and intelligent page indexing.
- **Model Manager:** Easily download, load, and manage local ONNX models. Support for cloud-based OpenAI-compatible APIs is also available for those who prefer it.
- **Semantic Search:** Find exactly what you need with vector-based search that understands the *meaning* of your query, not just keywords.
- **Multi-Document Workspaces:** Open multiple PDFs in a single project and chat across all of them (coming soon/in-progress).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Core Engine** | [Rust](https://www.rust-lang.org/) (High-performance backend) |
| **Desktop Runtime** | [Tauri 2](https://v2.tauri.app/) (Lightweight native app shell) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 7](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) |
| **Vector DB** | [LanceDB](https://lancedb.com/) (Local vector storage via Arrow) |
| **AI Inference** | [ort](https://github.com/pykeio/ort) (ONNX Runtime) & [tokenizers](https://github.com/huggingface/tokenizers) |
| **PDF Engine** | [pdfium-render](https://github.com/ajrcarey/pdfium-render) (Bundled Google Pdfium) |

---

## 🚦 Getting Started

### Prerequisites

- **Rust:** [Install Rust](https://rustup.rs/) (latest stable)
- **Node.js:** v18+ with `npm`, `pnpm`, or `bun`
- **System Dependencies:** See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Installation & Development

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-repo/aipdf-tauri.git
   cd aipdf-tauri
   ```

2. **Install frontend dependencies:**
   ```sh
   npm install
   ```

3. **Fetch Pdfium binaries:**
   ```sh
   bash scripts/fetch-pdfium.sh
   ```

4. **Launch development environment:**
   ```sh
   npm run tauri dev
   ```

---

## 📦 Project Architecture

AiPDF is designed for modularity and performance:

- **`src/` (Frontend):** Modern React application with a focus on resizable layouts and interactive AI components.
- **`src-tauri/src/` (Backend):**
    - `commands/`: Tauri commands for AI, PDF, and Workspace management.
    - `ai/`: Local inference engine, session management, and tokenizer wrappers.
    - `pdf/`: Native PDF processing and text extraction logic.
    - `rag_pipeline.rs`: The core logic for indexing and searching document context using LanceDB.
    - `db.rs`: SQLite integration for persistent metadata and chat history.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Tauri](https://tauri.app/) for the amazing framework.
- [Hugging Face](https://huggingface.co/) for the tokenizer and model ecosystem.
- [Google Pdfium](https://opensource.google/projects/pdfium) for the industry-standard PDF engine.
- [LanceDB](https://lancedb.com/) for making vector search fast and local.
