import { create } from "zustand"

export interface PdfInfo {
  fileName: string
  pageCount: number
  pageWidth: number
  pageHeight: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  contexts?: ChatContext[]
}

export interface ChatContext {
  type: "page" | "text"
  content: string
  label?: string
  id: string
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

export interface ChatSession {
  id: string
  name: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const CLOUD_MODELS_STORAGE_KEY = "aipdf-cloud-models"
const CHAT_SESSIONS_STORAGE_KEY = "aipdf-chat-sessions"
const ACTIVE_SESSION_KEY = "aipdf-active-session"

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

function readSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeSessions(sessions: ChatSession[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  }
}

function readActiveSession(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(ACTIVE_SESSION_KEY)
  } catch {
    return null
  }
}

function writeActiveSession(id: string | null) {
  if (typeof window !== "undefined") {
    if (id) {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, id)
    } else {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }
}

interface AppState {
  // PDF
  pdfInfo: PdfInfo | null
  currentPage: number
  renderedPages: Record<number, string> // page -> base64 image
  renderedPageDims: Record<number, { width: number; height: number }>
  zoom: number

  // AI
  loadedModel: ModelInfo | null
  isGenerating: boolean
  chatMessages: ChatMessage[]
  streamingToken: string
  chatContexts: ChatContext[]

  // UI
  sidebarOpen: boolean
  chatOpen: boolean
  modelManagerOpen: boolean
  downloadProgress: DownloadProgress | null
  cloudModels: CloudModelEntry[]
  lastPdfPath: string | null

  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  showSessions: boolean

  // Actions
  init: () => Promise<void>
  setPdfInfo: (info: PdfInfo | null) => void
  setLastPdfPath: (path: string | null) => void
  setCurrentPage: (page: number) => void
  setRenderedPage: (page: number, base64: string) => void
  setRenderedPageDim: (page: number, width: number, height: number) => void
  setZoom: (zoom: number) => void
  setLoadedModel: (model: ModelInfo | null) => void
  setIsGenerating: (generating: boolean) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  clearChat: () => void
  setStreamingToken: (token: string) => void
  appendStreamingToken: (token: string) => void
  addChatContext: (ctx: ChatContext) => void
  removeChatContext: (id: string) => void
  clearChatContexts: () => void
  setSidebarOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  setModelManagerOpen: (open: boolean) => void
  setDownloadProgress: (progress: DownloadProgress | null) => void
  addCloudModel: (model: CloudModelEntry) => void
  updateCloudModel: (model: CloudModelEntry) => void
  deleteCloudModel: (id: string) => void
  createSession: () => Promise<void>
  switchSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, name: string) => Promise<void>
  setShowSessions: (show: boolean) => void
}

import { invoke } from "@tauri-apps/api/core"

export const useStore = create<AppState>((set, get) => ({
  // PDF
  pdfInfo: null,
  currentPage: 0,
  renderedPages: {},
  renderedPageDims: {},
  zoom: 1.0,

  // AI
  loadedModel: null,
  isGenerating: false,
  chatMessages: [],
  streamingToken: "",
  chatContexts: [],

  // UI
  sidebarOpen: true,
  chatOpen: true,
  modelManagerOpen: false,
  downloadProgress: null,
  cloudModels: readCloudModels(),
  lastPdfPath: null,

  // Sessions
  sessions: [],
  activeSessionId: null,
  showSessions: false,

  // Actions
  init: async () => {
    try {
      const sessions = await invoke<any[]>("list_sessions", { limit: 3 })
      const mappedSessions: ChatSession[] = sessions.map(s => ({
        id: s.id,
        name: s.name,
        messages: [],
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
      
      const lastPdf = await invoke<string | null>("get_setting", { key: "last_pdf_path" })
      
      set({ sessions: mappedSessions, lastPdfPath: lastPdf })
      
      // Note: We don't restore the active session on startup anymore as per request
      // (start a new empty session). But we might want to keep activeSessionId null
      // until user opens PDF or creates one.
      writeActiveSession(null)
      set({ activeSessionId: null, chatMessages: [] })
    } catch (e) {
      console.error("Failed to init store:", e)
    }
  },
  setPdfInfo: (info) => set({ pdfInfo: info, currentPage: 0, renderedPages: {} }),
  setLastPdfPath: (path) => {
    set({ lastPdfPath: path })
    if (path) {
      invoke("set_setting", { key: "last_pdf_path", value: path }).catch(console.error)
    }
  },
  setCurrentPage: (page) => set({ currentPage: page }),
  setRenderedPage: (page, base64) =>
    set((state) => ({ renderedPages: { ...state.renderedPages, [page]: base64 } })),
  setRenderedPageDim: (page, width, height) =>
    set((state) => ({
      renderedPageDims: { ...state.renderedPageDims, [page]: { width, height } },
    })),
  setZoom: (zoom) => set({ zoom, renderedPages: {}, renderedPageDims: {} }),
  setLoadedModel: (model) => set({ loadedModel: model }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  addChatMessage: (message) =>
    set((state) => {
      // Deduplicate: skip if a message with this ID already exists
      if (state.chatMessages.some((m) => m.id === message.id)) {
        return {}
      }
      const newMessages = [...state.chatMessages, message]
      // Update active session locally
      if (state.activeSessionId) {
        const updatedSessions = state.sessions.map((s) =>
          s.id === state.activeSessionId
            ? { ...s, messages: newMessages, updatedAt: Date.now() }
            : s
        )
        return { chatMessages: newMessages, sessions: updatedSessions }
      }
      return { chatMessages: newMessages }
    }),
  setChatMessages: (messages) =>
    set((state) => {
      if (state.activeSessionId) {
        const updatedSessions = state.sessions.map((s) =>
          s.id === state.activeSessionId
            ? { ...s, messages, updatedAt: Date.now() }
            : s
        )
        return { chatMessages: messages, sessions: updatedSessions }
      }
      return { chatMessages: messages }
    }),
  clearChat: () => {
    // Note: We don't have a backend "clear" yet, but we can just delete messages for this session
    // For now, let's keep it simple and just clear locally (UI will reflect)
    // In a real app, we'd add a "delete_messages" command.
    set({ chatMessages: [], streamingToken: "" })
  },
  setStreamingToken: (token) => set({ streamingToken: token }),
  appendStreamingToken: (token) =>
    set((state) => ({ streamingToken: state.streamingToken + token })),
  addChatContext: (ctx) =>
    set((state) => ({ chatContexts: [...state.chatContexts, ctx] })),
  removeChatContext: (id) =>
    set((state) => ({ chatContexts: state.chatContexts.filter((c) => c.id !== id) })),
  clearChatContexts: () => set({ chatContexts: [] }),
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
  createSession: async () => {
    try {
      const name = `Chat ${get().sessions.length + 1}`
      const session = await invoke<any>("create_session", { name })
      const newSession: ChatSession = {
        id: session.id,
        name: session.name,
        messages: [],
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        chatMessages: [],
        streamingToken: "",
        showSessions: false,
      }))
      writeActiveSession(newSession.id)
    } catch (e) {
      console.error("Failed to create session:", e)
    }
  },
  switchSession: async (id) => {
    try {
      const messages = await invoke<any[]>("get_messages", { sessionId: id })
      set({
        activeSessionId: id,
        chatMessages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          contexts: m.contexts ? JSON.parse(m.contexts) : undefined
        })),
        streamingToken: "",
        showSessions: false,
      })
      writeActiveSession(id)
    } catch (e) {
      console.error("Failed to switch session:", e)
    }
  },
  deleteSession: async (id) => {
    try {
      await invoke("delete_session", { id })
      set((state) => {
        const updatedSessions = state.sessions.filter((s) => s.id !== id)
        const newState: Partial<AppState> = { sessions: updatedSessions }
        if (state.activeSessionId === id) {
          writeActiveSession(null)
          newState.activeSessionId = null
          newState.chatMessages = []
          newState.streamingToken = ""
        }
        return newState
      })
    } catch (e) {
      console.error("Failed to delete session:", e)
    }
  },
  renameSession: async (id, name) => {
    try {
      await invoke("rename_session", { id, name })
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)),
      }))
    } catch (e) {
      console.error("Failed to rename session:", e)
    }
  },
  setShowSessions: (show) => set({ showSessions: show }),
}))
