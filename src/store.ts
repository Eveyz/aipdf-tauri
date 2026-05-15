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
  type: "file" | "page" | "text"
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
  lastUsed?: boolean
}

export interface Workspace {
  id: string
  name: string
  type: "standard" | "quick_read"
  lastDocPath?: string
  createdAt: number
  updatedAt: number
}

export interface Document {
  id: string
  workspaceId: string
  path: string
  name: string
  createdAt: number
}

export interface ChatSession {
  id: string
  workspaceId: string
  name: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface HighlightPosition {
  boundingRect: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber?: number
  }
  rects: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber?: number
  }>
  pageNumber: number
}

export interface Highlight {
  id: string
  documentPath: string
  content: {
    text?: string
    image?: string
  }
  position: HighlightPosition
  comment?: {
    text: string
    emoji: string
  }
}

interface AppState {
  // Workspaces
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  documents: Document[]

  // PDF
  pdfInfo: PdfInfo | null
  currentPage: number
  renderedPages: Record<number, string> // page -> base64 image
  renderedPageDims: Record<number, { width: number; height: number }>
  zoom: number
  highlights: Highlight[]

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
  createWorkspace: (name: string, type?: "standard" | "quick_read") => Promise<string>
  switchWorkspace: (id: string) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  upgradeWorkspace: (id: string) => Promise<void>
  setWorkspaceLastDocPath: (path: string) => Promise<void>
  addDocument: (path: string) => Promise<void>
  setPdfInfo: (info: PdfInfo | null) => void
  setLastPdfPath: (path: string | null) => void
  setCurrentPage: (page: number) => void
  setRenderedPage: (page: number, base64: string) => void
  setRenderedPageDim: (page: number, width: number, height: number) => void
  setZoom: (zoom: number) => void
  addHighlight: (highlight: Highlight) => void
  clearHighlights: () => void
  deleteHighlight: (id: string) => void
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
  addCloudModel: (model: CloudModelEntry) => Promise<void>
  updateCloudModel: (model: CloudModelEntry) => Promise<void>
  deleteCloudModel: (id: string) => Promise<void>
  createSession: () => Promise<string | null>
  switchSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, name: string) => Promise<void>
  setShowSessions: (show: boolean) => void
}

import { invoke } from "@tauri-apps/api/core"

export const useStore = create<AppState>((set, get) => ({
  // Workspaces
  workspaces: [],
  activeWorkspaceId: null,
  documents: [],

  // PDF
  pdfInfo: null,
  currentPage: 0,
  renderedPages: {},
  renderedPageDims: {},
  zoom: 1.0,
  highlights: [],

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
  cloudModels: [],
  lastPdfPath: null,

  // Sessions
  sessions: [],
  activeSessionId: null,
  showSessions: false,

  // Actions
  init: async () => {
    try {
      const workspaces = await invoke<any[]>("list_workspaces", { limit: 20 })
      const mappedWorkspaces: Workspace[] = workspaces.map(w => {
        let type: "standard" | "quick_read" = "standard"
        let lastDocPath: string | undefined = undefined
        if (w.metadata) {
          try {
            const meta = JSON.parse(w.metadata)
            if (meta.type === "quick_read" || meta.type === "standard") {
              type = meta.type
            }
            lastDocPath = meta.lastDocPath
          } catch (e) {
            console.warn("Failed to parse workspace metadata:", e)
          }
        }
        return {
          id: w.id,
          name: w.name,
          type,
          lastDocPath,
          createdAt: w.created_at,
          updatedAt: w.updated_at
        }
      })
      
      const cloudModelsDb = await invoke<any[]>("list_cloud_models")
      const cloudModels: CloudModelEntry[] = cloudModelsDb.map(m => {
        const config = JSON.parse(m.config)
        return {
          id: m.id,
          name: m.name,
          vendor: config.vendor,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          modelName: config.modelName,
          lastUsed: m.last_used
        }
      })

      const lastPdf = await invoke<string | null>("get_setting", { key: "last_pdf_path" })
      const lastWsId = await invoke<string | null>("get_setting", { key: "active_workspace_id" })
      const lastModelId = await invoke<string | null>("get_setting", { key: "last_used_model_id" })
      
      set({ workspaces: mappedWorkspaces, cloudModels, lastPdfPath: lastPdf })

      if (lastWsId && mappedWorkspaces.some(w => w.id === lastWsId)) {
        await get().switchWorkspace(lastWsId)
      }

      if (lastModelId) {
        if (lastModelId.startsWith("cloud:")) {
          const cloudModel = cloudModels.find(m => `cloud:${m.id}` === lastModelId)
          if (cloudModel) {
            set({ loadedModel: {
              id: `cloud:${cloudModel.id}`,
              name: cloudModel.name,
              modelType: `${cloudModel.vendor} - ${cloudModel.modelName}`,
              hasTokenizer: false,
              path: cloudModel.baseUrl,
              source: "cloud",
              baseUrl: cloudModel.baseUrl,
              apiKey: cloudModel.apiKey,
              modelName: cloudModel.modelName,
            }})
          }
        } else {
          try {
            const info = await invoke<any>("load_model", { modelId: lastModelId })
            set({ loadedModel: { ...info, source: "local" } })
          } catch (e) {
            console.error("Failed to auto-load last model:", e)
          }
        }
      }
    } catch (e) {
      console.error("Failed to init store:", e)
    }
  },

  createWorkspace: async (name, type = "standard") => {
    const ws = await invoke<any>("create_workspace", { 
      name,
      metadata: JSON.stringify({ type })
    })
    const newWs: Workspace = {
      id: ws.id,
      name: ws.name,
      type: type,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at
    }
    set(state => ({ workspaces: [newWs, ...state.workspaces] }))
    return newWs.id
  },
switchWorkspace: async (id) => {
  const docs = await invoke<any[]>("get_documents", { workspaceId: id })
  const sessions = await invoke<any[]>("list_sessions", { workspaceId: id })

  invoke("set_setting", { key: "active_workspace_id", value: id }).catch(console.error)
  invoke("touch_workspace", { id }).catch(console.error)

  set((state) => ({
    activeWorkspaceId: id,
    workspaces: state.workspaces.map(w => 
      w.id === id ? { ...w, updatedAt: Date.now() } : w
    ),
      documents: docs.map(d => ({
        id: d.id,
        workspaceId: d.workspace_id,
        path: d.path,
        name: d.name,
        createdAt: d.created_at
      })),
      sessions: sessions.map(s => ({
        id: s.id,
        workspaceId: s.workspace_id,
        name: s.name,
        messages: [],
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })),
      activeSessionId: sessions[0]?.id || null,
      chatMessages: [], 
      pdfInfo: null, 
    }))

    if (sessions[0]) {
      get().switchSession(sessions[0].id)
    }
  },

  deleteWorkspace: async (id) => {
    await invoke("delete_workspace", { id })
    set(state => ({
      workspaces: state.workspaces.filter(w => w.id !== id),
      activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId
    }))
  },

  upgradeWorkspace: async (id) => {
    // In a real app, we'd call a backend command to update metadata.
    // Let's assume update_workspace_metadata exists or just handle it locally if it fails.
    const ws = get().workspaces.find(w => w.id === id)
    const newMetadata = JSON.stringify({ 
      type: "standard",
      lastDocPath: ws?.lastDocPath 
    })

    try {
      await invoke("update_workspace_metadata", { 
        id, 
        metadata: newMetadata 
      })
    } catch (e) {
      console.warn("Failed to update workspace metadata on backend:", e)
    }
    
    set(state => ({
      workspaces: state.workspaces.map(w => 
        w.id === id ? { ...w, type: "standard" } : w
      )
    }))
  },

  setWorkspaceLastDocPath: async (path) => {
    const id = get().activeWorkspaceId
    if (!id) return

    const ws = get().workspaces.find(w => w.id === id)
    if (!ws) return

    const newMetadata = JSON.stringify({ 
      type: ws.type,
      lastDocPath: path 
    })

    try {
      await invoke("update_workspace_metadata", { 
        id, 
        metadata: newMetadata 
      })
    } catch (e) {
      console.warn("Failed to update workspace metadata on backend:", e)
    }

    set(state => ({
      workspaces: state.workspaces.map(w => 
        w.id === id ? { ...w, lastDocPath: path } : w
      )
    }))
  },

  addDocument: async (path) => {
    const wsId = get().activeWorkspaceId
    if (!wsId) return

    const name = path.split("/").pop() || "Unknown"
    const doc = await invoke<any>("add_document", { workspaceId: wsId, path, name })
    const newDoc: Document = {
      id: doc.id,
      workspaceId: doc.workspace_id,
      path: doc.path,
      name: doc.name,
      createdAt: doc.created_at
    }
    set(state => ({ documents: [...state.documents, newDoc] }))
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
  addHighlight: (highlight) => set((state) => ({ highlights: [...state.highlights, highlight] })),
  clearHighlights: () => set({ highlights: [] }),
  deleteHighlight: (id) => set((state) => ({ highlights: state.highlights.filter(h => h.id !== id) })),
  setLoadedModel: (model) => {
    set({ loadedModel: model })
    if (model) {
      invoke("set_last_used_model", { id: model.id }).catch(console.error)
    }
  },
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
  addCloudModel: async (model) => {
    await invoke("save_cloud_model", {
      id: model.id,
      name: model.name,
      vendor: model.vendor,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      modelName: model.modelName
    })
    set((state) => ({ cloudModels: [...state.cloudModels, model] }))
  },
  updateCloudModel: async (model) => {
    await invoke("save_cloud_model", {
      id: model.id,
      name: model.name,
      vendor: model.vendor,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      modelName: model.modelName
    })
    set((state) => ({
      cloudModels: state.cloudModels.map((m) => (m.id === model.id ? model : m)),
    }))
  },
  deleteCloudModel: async (id) => {
    await invoke("delete_cloud_model_entry", { id })
    set((state) => ({
      cloudModels: state.cloudModels.filter((m) => m.id !== id),
      loadedModel: state.loadedModel?.id === `cloud:${id}` ? null : state.loadedModel,
    }))
  },
  createSession: async () => {
    const wsId = get().activeWorkspaceId
    if (!wsId) {
      console.warn("[Store] Cannot create session: No active workspace")
      return null
    }

    try {
      const name = `Chat ${get().sessions.length + 1}`
      const session = await invoke<any>("create_session", { workspaceId: wsId, name })
      const newSession: ChatSession = {
        id: session.id,
        workspaceId: session.workspace_id,
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
      return newSession.id
    } catch (e) {
      console.error("[Store] Failed to create session:", e)
      return null
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
