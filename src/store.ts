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
  source?: "local" | "cloud"
  baseUrl?: string
  apiKey?: string
  modelName?: string
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

export interface CloudModelEntry {
  id: string
  name: string
  vendor: string
  baseUrl: string
  apiKey: string
  modelName: string
}

const CLOUD_MODELS_STORAGE_KEY = "aipdf-cloud-models"

function readCloudModels(): CloudModelEntry[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(CLOUD_MODELS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeCloudModels(models: CloudModelEntry[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLOUD_MODELS_STORAGE_KEY, JSON.stringify(models))
  }
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
  selectedPdfText: string

  // UI
  sidebarOpen: boolean
  chatOpen: boolean
  modelManagerOpen: boolean
  downloadProgress: DownloadProgress | null
  cloudModels: CloudModelEntry[]

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
  setSelectedPdfText: (text: string) => void
  setSidebarOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  setModelManagerOpen: (open: boolean) => void
  setDownloadProgress: (progress: DownloadProgress | null) => void
  addCloudModel: (model: CloudModelEntry) => void
  updateCloudModel: (model: CloudModelEntry) => void
  deleteCloudModel: (id: string) => void
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
  selectedPdfText: "",

  // UI
  sidebarOpen: true,
  chatOpen: true,
  modelManagerOpen: false,
  downloadProgress: null,
  cloudModels: readCloudModels(),

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
  setSelectedPdfText: (text) => set({ selectedPdfText: text }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setModelManagerOpen: (open) => set({ modelManagerOpen: open }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  addCloudModel: (model) =>
    set((state) => {
      const cloudModels = [...state.cloudModels, model]
      writeCloudModels(cloudModels)
      return { cloudModels }
    }),
  updateCloudModel: (model) =>
    set((state) => {
      const cloudModels = state.cloudModels.map((m) => (m.id === model.id ? model : m))
      writeCloudModels(cloudModels)
      return { cloudModels }
    }),
  deleteCloudModel: (id) =>
    set((state) => {
      const cloudModels = state.cloudModels.filter((m) => m.id !== id)
      writeCloudModels(cloudModels)
      return {
        cloudModels,
        loadedModel: state.loadedModel?.id === `cloud:${id}` ? null : state.loadedModel,
      }
    }),
}))
