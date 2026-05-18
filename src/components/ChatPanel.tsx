import { useEffect, useRef, useState, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { ChatHistoryModal } from "./ChatHistoryModal"
import { useStore } from "../store"
import { ScrollArea } from "./ui/scroll-area"
import { ChatHeader } from "./chat/ChatHeader"
import { MessageList } from "./chat/MessageList"
import { ChatInput } from "./chat/ChatInput"

export function ChatPanel() {
  const generate = useStore(state => state.generate)
  
  // Specific selectors to avoid unnecessary re-renders
  const isGenerating = useStore(state => state.isGenerating)
  const chatMessagesCount = useStore(state => state.chatMessages.length)
  const streamingToken = useStore(state => state.streamingToken)
  const loadedModel = useStore(state => state.loadedModel)
  const activeSessionId = useStore(state => state.activeSessionId)
  const pdfInfo = useStore(state => state.pdfInfo)
  const currentPage = useStore(state => state.currentPage)
  const lastPdfPath = useStore(state => state.lastPdfPath)

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [rawMessageIds, setRawMessageIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const toggleRaw = useCallback((id: string) => {
    setRawMessageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [chatMessagesCount, streamingToken, scrollToBottom])

  // Scroll to bottom when session becomes active
  useEffect(() => {
    if (activeSessionId) {
      const timer = setTimeout(() => scrollToBottom(), 50)
      return () => clearTimeout(timer)
    }
  }, [activeSessionId, scrollToBottom])

  const handleAddCurrentPage = useCallback(async () => {
    if (!pdfInfo) return
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const result = await invoke<any>("get_page_text", { pageIndex: currentPage })
      useStore.getState().addChatContext({
        type: "page",
        content: result.full_text || `Content of page ${currentPage + 1}`,
        label: `Page ${currentPage + 1}`,
        id: crypto.randomUUID(),
      })
    } catch (e) {
      console.error("Failed to add page context:", e)
    }
  }, [pdfInfo, currentPage])

  const handleAddFullDocument = useCallback(async () => {
    if (!pdfInfo || !lastPdfPath) return
    useStore.getState().addChatContext({
      type: "file",
      content: `Full document: ${pdfInfo.fileName}`,
      label: pdfInfo.fileName,
      id: crypto.randomUUID(),
    })
  }, [pdfInfo, lastPdfPath])

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt || useStore.getState().isGenerating) return

    try {
      let currentSessionId = useStore.getState().activeSessionId
      if (!currentSessionId) {
        currentSessionId = await useStore.getState().createSession()
      }

      if (!currentSessionId) {
        throw new Error("Failed to create or activate a session. Please ensure a workspace is active.")
      }

      const contexts = useStore.getState().chatContexts
      const capturedContexts = contexts.length > 0 ? [...contexts] : undefined

      useStore.getState().addChatMessage({ 
        id: crypto.randomUUID(), 
        role: "user", 
        content: prompt, 
        contexts: capturedContexts 
      })
      useStore.getState().clearChatContexts()

      await generate(prompt, capturedContexts)
    } catch (err) {
      console.error("Failed to send message:", err)
      alert("Error: " + (err instanceof Error ? err.message : String(err)))
    }
  }, [generate])

  const handleRetry = useCallback(async (index: number) => {
    if (useStore.getState().isGenerating) return
    const messages = useStore.getState().chatMessages.slice(0, index)
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg && lastUserMsg.role === "user") {
      useStore.getState().setChatMessages(messages)
      await generate(lastUserMsg.content, lastUserMsg.contexts)
    }
  }, [generate])

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-white overflow-hidden max-w-full relative">
      <ChatHistoryModal 
        open={historyModalOpen} 
        onOpenChange={setHistoryModalOpen} 
      />

      <ChatHeader onOpenHistory={() => setHistoryModalOpen(true)} />

      <ScrollArea className="scrollbar-thin min-h-0 flex-1 w-full overflow-hidden">
        <div className="flex flex-col gap-6 py-4 w-full overflow-hidden">
          {!loadedModel && (
            <p className="text-center text-xs font-normal text-muted-foreground px-4">
              Load a model from settings to start chatting
            </p>
          )}

          {chatMessagesCount === 0 && loadedModel && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 shrink-0" />
              <p className="text-xs font-normal text-muted-foreground">
                Ask about the PDF
              </p>
            </div>
          )}

          <MessageList 
            onRetry={handleRetry}
            onToggleRaw={toggleRaw}
            rawMessageIds={rawMessageIds}
          />
          
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </ScrollArea>

      <ChatInput 
        onSend={handleSend}
        onAddCurrentPage={handleAddCurrentPage}
        onAddFullDocument={handleAddFullDocument}
      />
    </div>
  )
}
