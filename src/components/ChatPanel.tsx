import { useEffect, useRef, useState } from "react"
import {
  Send,
  Square,
  Trash2,
  X,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Copy,
  RotateCcw,
  Loader2,
  Wand2,
  Check,
  Circle,
  History,
  MoreHorizontal,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChatHistoryModal } from "./ChatHistoryModal"
import { useAi } from "../hooks/useAi"
import { useStore, type ChatContext } from "../store"
import { cn } from "../lib/utils"
import { ScrollArea } from "./ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm w-full min-w-0 max-w-none overflow-hidden text-gray-800 text-[13px] leading-relaxed break-words [overflow-wrap:anywhere]">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-950 mt-4 mb-2 break-words whitespace-normal [overflow-wrap:anywhere]" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-[14px] font-semibold text-gray-900 mt-3 mb-1.5 break-words whitespace-normal [overflow-wrap:anywhere]" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-[13px] font-medium text-gray-800 mt-2 mb-1 break-words whitespace-normal [overflow-wrap:anywhere]" {...props} />,
          p: ({node, ...props}) => <p className="break-words whitespace-normal [overflow-wrap:anywhere]" {...props} />,
          table: ({node, ...props}) => (
            <div className="w-full max-w-full overflow-x-auto my-3 border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full table-fixed divide-y divide-gray-200 text-[12px]" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-gray-50 text-gray-900 font-semibold" {...props} />,
          th: ({node, ...props}) => <th className="px-3 py-2 text-left break-words [overflow-wrap:anywhere]" {...props} />,
          td: ({node, ...props}) => <td className="px-3 py-2 text-gray-600 border-t border-gray-100 break-words [overflow-wrap:anywhere]" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1 break-words [overflow-wrap:anywhere]" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1 break-words [overflow-wrap:anywhere]" {...props} />,
          li: ({node, ...props}) => <li className="text-gray-700 break-words [overflow-wrap:anywhere]" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-gray-950" {...props} />,
          code: ({node, ...props}) => <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded font-mono text-[11px] break-words [overflow-wrap:anywhere]" {...props} />,
          pre: ({node, ...props}) => (
            <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 my-2 w-full max-w-full overflow-x-auto custom-scrollbar" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Context pill for context display (file, page, text)
function ContextPill({ ctx, onRemove }: { ctx: ChatContext, onRemove?: (id: string) => void }) {
  const icon = ctx.type === "file" ? <MessageSquare className="w-3 h-3 text-blue-500" /> : ctx.type === "page" ? <Plus className="w-3 h-3 text-orange-500" /> : <RotateCcw className="w-3 h-3 text-green-500" />

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[11px] text-gray-600 font-medium max-w-[180px] animate-in fade-in zoom-in duration-200">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{ctx.label || ctx.content}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(ctx.id)}
          className="h-3.5 w-3.5 shrink-0 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-900 transition-colors ml-0.5"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

// Thinking state indicator
function ThinkingIndicator({ isStreaming, isWaiting }: { isStreaming: boolean, isWaiting?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-2 w-full min-w-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors w-full min-w-0",
          isWaiting && "animate-pulse"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isStreaming || isWaiting ? (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          ) : (
            <Wand2 className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{isStreaming || isWaiting ? "Thinking..." : "Analyzed context"}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-l-2 border-gray-200 pl-3 py-1 my-2 text-xs text-gray-500 italic leading-relaxed break-words">
          {isWaiting ? "Connecting to model..." : "Processing document context and formulating response..."}
        </div>
      )}
    </div>
  )
}

// Action bar that appears on hover
function ActionBar({ content, onRetry, onToggleRaw, isRaw }: { content: string, onRetry?: () => void, onToggleRaw?: () => void, isRaw?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="flex items-center justify-between mt-3 transition-opacity duration-200 w-full min-w-0 gap-2">
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onRetry}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-slate-200"
          title="Regenerate"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleRaw}
          className={cn(
            "p-1.5 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-slate-200",
            isRaw ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          )}
          title="Toggle Raw Text"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCopy}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-slate-200"
          title="Copy"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <span className="text-[10px] text-gray-400 font-mono tracking-tight truncate">
        mimo-v2.5-pro
      </span>
    </div>
  )
}

export function ChatPanel() {
  const { generate, stopGeneration } = useAi()
  const {
    isGenerating,
    chatMessages,
    streamingToken,
    loadedModel,
    clearChat,
    cloudModels,
    setLoadedModel,
    chatContexts,
    addChatContext,
    removeChatContext,
    clearChatContexts,
    sessions,
    activeSessionId,
    showSessions,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    setShowSessions,
    pdfInfo,
    currentPage,
    lastPdfPath,
  } = useStore()

  const [input, setInput] = useState("")
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [rawMessageIds, setRawMessageIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  const toggleRaw = (id: string) => {
    setRawMessageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, streamingToken])

  // Scroll to bottom when session becomes active
  useEffect(() => {
    if (activeSessionId) {
      // Small timeout to ensure DOM has rendered
      const timer = setTimeout(() => scrollToBottom(), 50)
      return () => clearTimeout(timer)
    }
  }, [activeSessionId])

  async function handleAddCurrentPage() {
    if (!pdfInfo) return
    setShowContextMenu(false)
    setInput(prev => prev.replace(/@$/, ""))
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const result = await invoke<any>("get_page_text", { pageIndex: currentPage })
      addChatContext({
        type: "page",
        content: result.full_text || `Content of page ${currentPage + 1}`,
        label: `Page ${currentPage + 1}`,
        id: crypto.randomUUID(),
      })
    } catch (e) {
      console.error("Failed to add page context:", e)
    }
  }

  async function handleAddFullDocument() {
    if (!pdfInfo || !lastPdfPath) return
    setShowContextMenu(false)
    setInput(prev => prev.replace(/@$/, ""))
    addChatContext({
      type: "file",
      content: `Full document: ${pdfInfo.fileName}`,
      label: pdfInfo.fileName,
      id: crypto.randomUUID(),
    })
  }

  async function handleSend() {
    const prompt = input.trim()
    if (!prompt || isGenerating) return

    try {
      let currentSessionId = activeSessionId
      if (!currentSessionId) {
        currentSessionId = await createSession()
      }

      if (!currentSessionId) {
        throw new Error("Failed to create or activate a session. Please ensure a workspace is active.")
      }

      setInput("")

      // Capture current contexts before clearing
      const contexts = chatContexts.length > 0 ? [...chatContexts] : undefined

      // Add user message with contexts
      const { addChatMessage } = useStore.getState()
      addChatMessage({ id: crypto.randomUUID(), role: "user", content: prompt, contexts })
      clearChatContexts()

      // Generate AI response
      await generate(prompt, contexts)
    } catch (err) {
      console.error("Failed to send message:", err)
      alert("Error: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  async function handleRetry(index: number) {
    if (isGenerating) return
    const messages = chatMessages.slice(0, index)
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg && lastUserMsg.role === "user") {
      // Remove messages after index
      const { setChatMessages } = useStore.getState()
      setChatMessages(messages)
      await generate(lastUserMsg.content, lastUserMsg.contexts)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === "@") {
      setShowContextMenu(true)
    }
  }

  function handleModelSelect(value: string) {
    const model = cloudModels.find((entry) => `cloud:${entry.id}` === value)
    if (!model) return

    setLoadedModel({
      id: `cloud:${model.id}`,
      name: model.name,
      modelType: `${model.vendor} - ${model.modelName}`,
      hasTokenizer: false,
      path: model.baseUrl,
      source: "cloud",
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      modelName: model.modelName,
    })
  }


  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-white overflow-hidden max-w-full relative">
      <ChatHistoryModal 
        open={historyModalOpen} 
        onOpenChange={setHistoryModalOpen} 
      />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5 w-full overflow-hidden h-[40px]">
        <div className="flex items-center min-w-0 pr-2">
          <span className="text-[13px] font-semibold text-gray-800 truncate">
            {sessions.find(s => s.id === activeSessionId)?.name || "New Session"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={createSession}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea className="scrollbar-thin min-h-0 flex-1 w-full overflow-hidden">
        <div className="flex flex-col gap-6 py-4 w-full overflow-hidden">
          {!loadedModel && (
            <p className="text-center text-xs font-normal text-muted-foreground px-4">
              Load a model from settings to start chatting
            </p>
          )}

          {chatMessages.length === 0 && loadedModel && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 shrink-0" />
              <p className="text-xs font-normal text-muted-foreground">
                Ask about the PDF
              </p>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full px-4 min-w-0 overflow-hidden",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "user" ? (
                <div className="max-w-[92%] flex flex-col items-end min-w-0 overflow-hidden">
                  {msg.contexts && msg.contexts.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5 mb-2 w-full overflow-hidden">
                      {msg.contexts.map((ctx) => (
                        <ContextPill key={ctx.id} ctx={ctx} />
                      ))}
                    </div>
                  )}
                  <div className="bg-[#F8F9FB] border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm overflow-hidden break-words w-fit max-w-full">
                    <p className="text-[13px] text-gray-800 leading-relaxed whitespace-normal break-words [overflow-wrap:anywhere]">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[95%] flex flex-col min-w-0 overflow-hidden w-full">
                  <ThinkingIndicator isStreaming={false} />
                  <div className="w-full min-w-0 pb-1 overflow-hidden">
                    {rawMessageIds.has(msg.id) ? (
                      <pre className="text-[11px] font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 w-full min-w-0 max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-600 leading-relaxed">
                        {msg.content}
                      </pre>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <ActionBar 
                      content={msg.content} 
                      onRetry={() => handleRetry(idx)} 
                      onToggleRaw={() => toggleRaw(msg.id)}
                      isRaw={rawMessageIds.has(msg.id)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {(streamingToken || isGenerating) && (
            <div className="flex justify-start w-full px-4 min-w-0 overflow-hidden">
              <div className="max-w-[95%] flex flex-col min-w-0 overflow-hidden w-full">
                <ThinkingIndicator isStreaming={!!streamingToken} isWaiting={!streamingToken} />
                {streamingToken && (
                  <div className="w-full min-w-0 pb-1 overflow-hidden">
                    {rawMessageIds.has("streaming") ? (
                      <pre className="text-[11px] font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 w-full min-w-0 max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-600 leading-relaxed">
                        {streamingToken}
                      </pre>
                    ) : (
                      <MarkdownRenderer content={streamingToken} />
                    )}
                    <ActionBar 
                      content={streamingToken} 
                      onToggleRaw={() => toggleRaw("streaming")}
                      isRaw={rawMessageIds.has("streaming")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="shrink-0 w-full p-4 pt-0">
        <div className="relative w-full">
          {showContextMenu && (
            <div 
              ref={contextMenuRef}
              className="absolute bottom-full left-0 mb-1.5 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight">Attach Context</div>
              <button 
                onClick={handleAddCurrentPage}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="flex-1 text-left font-medium">Current Page</span>
                <span className="text-[10px] text-gray-400 font-mono">p.{currentPage + 1}</span>
              </button>
              <button 
                onClick={handleAddFullDocument}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="flex-1 text-left font-medium">Full Document</span>
                <span className="text-[10px] text-gray-400 font-mono">PDF</span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <div className="px-3 py-1 text-[10px] font-medium text-gray-300 italic">More sources coming soon...</div>
            </div>
          )}

          <div className="relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus-within:border-blue-400/60 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all overflow-hidden">
            {chatContexts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                {chatContexts.map((ctx) => (
                  <ContextPill key={ctx.id} ctx={ctx} onRemove={removeChatContext} />
                ))}
              </div>
            )}

            <textarea
              className="min-h-[100px] w-full resize-none bg-transparent px-3.5 py-3 text-[13px] font-normal outline-none placeholder:text-gray-400 leading-relaxed"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loadedModel ? "Ask a question or type @ to add context..." : "Load a model first..."}
              disabled={!loadedModel}
            />

            <div className="flex items-center justify-between px-2.5 py-2 bg-gray-50/50 border-t border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <button
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm hover:border-blue-400/50 hover:text-blue-600 transition-all shrink-0",
                    showContextMenu && "border-blue-400/50 text-blue-600 ring-2 ring-blue-500/5"
                  )}
                  title="Add context"
                >
                  <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200", showContextMenu && "rotate-45")} />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />

                <Select value={loadedModel?.id} onValueChange={handleModelSelect}>
                  <SelectTrigger className="h-7 min-w-0 border-0 px-2 py-0 text-[11px] font-semibold shadow-none bg-transparent hover:bg-white hover:shadow-sm rounded-md transition-all">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[240px]">
                    {loadedModel?.source === "local" && (
                      <SelectItem value={loadedModel.id} className="text-xs">
                        {loadedModel.name}
                      </SelectItem>
                    )}
                    {cloudModels.map((model) => (
                      <SelectItem
                        key={model.id}
                        value={`cloud:${model.id}`}
                        className="text-xs"
                      >
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {chatMessages.length > 0 && (
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm transition-all shrink-0"
                    onClick={clearChat}
                    title="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {isGenerating ? (
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 shadow-sm hover:bg-red-100 transition-all shrink-0"
                    onClick={stopGeneration}
                    title="Stop"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    className={cn(
                      "h-7 px-3.5 flex items-center justify-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm shrink-0",
                      !loadedModel || !input.trim()
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    )}
                    onClick={handleSend}
                    disabled={!loadedModel || !input.trim()}
                    title="Send"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
