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
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useAi } from "../hooks/useAi"
import { useStore, type ChatContext } from "../store"
import { ScrollArea } from "./ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

// Context pill for context display (file, page, text)
function ContextPill({ ctx }: { ctx: ChatContext }) {
  const iconChar = ctx.type === "file" ? "📁" : ctx.type === "page" ? "🔖" : "📝"

  return (
    <span className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm text-[11px] text-slate-600 font-mono max-w-[180px]">
      <span className="shrink-0">{iconChar}</span>
      <span className="truncate">{ctx.label || ctx.content}</span>
    </span>
  )
}

// Thinking state indicator
function ThinkingIndicator({ isStreaming, isWaiting }: { isStreaming: boolean, isWaiting?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors ${isWaiting ? "animate-pulse" : ""}`}
      >
        {isStreaming || isWaiting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Wand2 className="h-3 w-3" />
        )}
        <span>{isStreaming || isWaiting ? "Thinking..." : "Analyzed context"}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-gray-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-l-2 border-gray-200 pl-3 py-1 my-2 text-xs text-gray-500 italic leading-relaxed">
          {isWaiting ? "Connecting to model..." : "Processing document context and formulating response..."}
        </div>
      )}
    </div>
  )
}

// Action bar that appears on hover
function ActionBar({ content, onRetry }: { content: string, onRetry?: () => void }) {
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
    <div className="flex items-center justify-between mt-3 transition-opacity duration-200">
      <div className="flex items-center gap-1">
        <button
          onClick={onRetry}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-slate-200"
          title="Regenerate"
        >
          <RotateCcw className="w-3.5 h-3.5" />
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
      <span className="text-[11px] text-gray-400 font-mono tracking-tight">
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
  } = useStore()

  const [input, setInput] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displaySessions = isSessionsExpanded ? sessions : sessions.slice(0, 3)

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

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

  // Auto-generate title for new sessions

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

  function handleStartRename(sessionId: string, currentName: string) {
    setEditingSessionId(sessionId)
    setEditName(currentName)
  }

  function handleSaveRename(sessionId: string) {
    if (editName.trim()) {
      renameSession(sessionId, editName.trim())
    }
    setEditingSessionId(null)
    setEditName("")
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (days === 1) return "Yesterday"
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" })
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <button
          onClick={() => setShowSessions(!showSessions)}
          className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
        >
          {showSessions ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Sessions</span>
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
          onClick={createSession}
          title="New session"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions list */}
      {showSessions && (
        <div className="shrink-0 border-b bg-gray-50/30">
          {/* Scrollable Wrapper */}
          <div className={`flex flex-col gap-1 transition-all duration-300 py-1 ${
            isSessionsExpanded 
              ? 'max-h-[30vh] overflow-y-auto custom-scrollbar pr-1' 
              : 'overflow-hidden'
          }`}>
            {sessions.length === 0 ? (
              <p className="px-3 py-2 text-xs font-normal text-muted-foreground italic">No sessions in this workspace</p>
            ) : (
              displaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative flex items-center px-0.5 rounded-lg transition-colors mx-1 border border-transparent ${
                    session.id === activeSessionId ? "bg-gray-100 border-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  {/* Selection Click Area - Sits behind everything */}
                  <div 
                    className="absolute inset-0 z-0 cursor-pointer"
                    onClick={() => switchSession(session.id)}
                  />

                  {/* Content Wrapper - Floating above the click area */}
                  <div className="relative z-10 flex items-center gap-2 px-2 py-1 w-full min-w-0 pointer-events-none">
                    <Circle className={`h-2 w-2 shrink-0 mt-[1px] ${session.id === activeSessionId ? "text-primary" : "text-gray-400"}`} />
                    
                    <div className="min-w-0 flex-1 pr-14">
                      {editingSessionId === session.id ? (
                        <input
                          autoFocus
                          className="w-full bg-transparent text-[13px] font-medium outline-none border-b border-primary/30 pb-0.5 pointer-events-auto"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleSaveRename(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(session.id)
                            if (e.key === "Escape") {
                              setEditingSessionId(null)
                              setEditName("")
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={`truncate text-xs font-medium ${session.id === activeSessionId ? "text-gray-900" : "text-gray-700"}`}>
                          {session.name}
                        </span>
                      )}
                    </div>
                    
                    {/* Action Icons - Also floating above, needs pointer-events-auto */}
                    <div 
                      className={`absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-auto ${editingSessionId === session.id ? "hidden" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(session.id, session.name)
                        }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm("Delete this session?")) {
                            deleteSession(session.id)
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {!editingSessionId && (
                      <span className="absolute right-2 text-[10px] text-gray-400 group-hover:opacity-0 transition-opacity">
                        {formatDate(session.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Toggle Button - Kept outside scrollable wrapper */}
          {sessions.length > 3 && (
            <button 
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="mt-1 mb-2 w-full text-left pl-4 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100/50 rounded transition-colors"
            >
              {isSessionsExpanded ? "Show less" : `View all ${sessions.length} sessions`}
            </button>
          )}
        </div>
      )}

      {/* Chat messages */}
      <ScrollArea className="scrollbar-thin min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {!loadedModel && (
            <p className="text-center text-xs font-normal text-muted-foreground">
              Load a model from settings to start chatting
            </p>
          )}

          {chatMessages.length === 0 && loadedModel && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs font-normal text-muted-foreground">
                Ask about the PDF
              </p>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                /* User message */
                <div className="max-w-[90%] flex flex-col items-end mb-4">
                  <div className="bg-[#F8F9FB] border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                    <p className="text-[13px] text-gray-800 leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.contexts && msg.contexts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.contexts.map((ctx) => (
                        <ContextPill key={ctx.id} ctx={ctx} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* AI message */
                <div className="max-w-[92%] mb-4">
                  <ThinkingIndicator isStreaming={false} />
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <ActionBar content={msg.content} onRetry={() => handleRetry(idx)} />
                </div>
              )}
            </div>
          ))}

          {/* Streaming message or Loading state */}
          {(streamingToken || isGenerating) && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[92%]">
                <ThinkingIndicator isStreaming={!!streamingToken} isWaiting={!streamingToken} />
                {streamingToken && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                    <ReactMarkdown>{streamingToken}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Bottom marker for auto-scrolling */}
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="shrink-0">
        {/* Context pills (pending) */}
        {chatContexts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
            {chatContexts.map((ctx) => (
              <span
                key={ctx.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm text-[11px] text-slate-600 font-mono max-w-[180px]"
              >
                <span className="shrink-0">
                  {ctx.type === "file" ? "📁" : ctx.type === "page" ? "🔖" : "📝"}
                </span>
                <span className="truncate">{ctx.label || ctx.content}</span>
                <button
                  onClick={() => removeChatContext(ctx.id)}
                  className="h-4 w-4 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="p-2">
          <div className="relative rounded-xl border border-gray-200/60 bg-gray-50/50 focus-within:border-gray-300 focus-within:bg-white transition-colors">
            <textarea
              className="min-h-[56px] w-full resize-none bg-transparent px-3 py-2.5 text-sm font-normal outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loadedModel ? "Ask about the PDF..." : "Load a model first..."}
              disabled={!loadedModel}
            />

            <div className="flex items-center justify-between px-2.5 py-1.5">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <Select value={loadedModel?.id} onValueChange={handleModelSelect}>
                  <SelectTrigger className="h-6 min-w-0 border-0 px-1.5 py-0 text-[11px] font-normal shadow-none bg-transparent hover:bg-accent/50 rounded transition-colors">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
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

              <div className="flex items-center gap-0.5">
                {chatMessages.length > 0 && (
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    onClick={clearChat}
                    title="Clear chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}

                {isGenerating ? (
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={stopGeneration}
                    title="Stop"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                      !loadedModel || !input.trim()
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-foreground hover:bg-accent/50"
                    }`}
                    onClick={handleSend}
                    disabled={!loadedModel || !input.trim()}
                    title="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
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