import { create } from "zustand"

export interface PdfInfo {
  fileName: string
  pageCount: number
  pageWidth: number
  pageHeight: number
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ModelInfo {
  id: string
  name: string
  modelType: string
  hasTokenizer: boolean
  path: string
}

export interface ModelEntry {
  id: string
  name: string
  path: string
  model_type: string
  has_tokenizer: boolean
  has_model: boolean
  model_size_mb: number
}

export interface DownloadProgress {
  model_id: string
  file_name: string
  bytes_downloaded: number
  total_bytes: number
  percentage: number
}

interface AppState {
  // PDF
  pdfInfo: PdfInfo | null
  currentPage: number
  renderedPages: Record<number, string> // page -> base64 image
  zoom: number

  // AI
  loadedModel: ModelInfo | null
  isGenerating: boolean
  chatMessages: ChatMessage[]
  streamingToken: string

  // UI
  sidebarOpen: boolean
  chatOpen: boolean
  modelManagerOpen: boolean
  downloadProgress: DownloadProgress | null

  // Actions
  setPdfInfo: (info: PdfInfo | null) => void
  setCurrentPage: (page: number) => void
  setRenderedPage: (page: number, base64: string) => void
  setZoom: (zoom: number) => void
  setLoadedModel: (model: ModelInfo | null) => void
  setIsGenerating: (generating: boolean) => void
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  setStreamingToken: (token: string) => void
  appendStreamingToken: (token: string) => void
  setSidebarOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  setModelManagerOpen: (open: boolean) => void
  setDownloadProgress: (progress: DownloadProgress | null) => void
}

export const useStore = create<AppState>((set) => ({
  // PDF
  pdfInfo: null,
  currentPage: 0,
  renderedPages: {},
  zoom: 1.5,

  // AI
  loadedModel: null,
  isGenerating: false,
  chatMessages: [],
  streamingToken: "",

  // UI
  sidebarOpen: true,
  chatOpen: true,
  modelManagerOpen: false,
  downloadProgress: null,

  // Actions
  setPdfInfo: (info) => set({ pdfInfo: info, currentPage: 0, renderedPages: {} }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setRenderedPage: (page, base64) =>
    set((state) => ({ renderedPages: { ...state.renderedPages, [page]: base64 } })),
  setZoom: (zoom) => set({ zoom, renderedPages: {} }),
  setLoadedModel: (model) => set({ loadedModel: model }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [], streamingToken: "" }),
  setStreamingToken: (token) => set({ streamingToken: token }),
  appendStreamingToken: (token) =>
    set((state) => ({ streamingToken: state.streamingToken + token })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setModelManagerOpen: (open) => set({ modelManagerOpen: open }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
}))
