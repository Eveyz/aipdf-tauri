import React, { useState } from "react"
import {
  MessageSquare,
  Plus,
  RotateCcw,
  X,
  Loader2,
  Wand2,
  ChevronUp,
  ChevronRight,
  Check,
  Copy,
  Square
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "../../lib/utils"
import { type ChatContext, type ChatMessage } from "../../store"

// Markdown Renderer Component
export const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
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
})

MarkdownRenderer.displayName = "MarkdownRenderer"

// Context pill for context display (file, page, text)
export function ContextPill({ ctx, onRemove }: { ctx: ChatContext, onRemove?: (id: string) => void }) {
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
export function ThinkingIndicator({ isStreaming, isWaiting }: { isStreaming: boolean, isWaiting?: boolean }) {
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
export function ActionBar({ content, onRetry, onToggleRaw, isRaw }: { content: string, onRetry?: () => void, onToggleRaw?: () => void, isRaw?: boolean }) {
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
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-slate-200"
            title="Regenerate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
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

interface MessageItemProps {
  message: ChatMessage
  isStreaming?: boolean
  isWaiting?: boolean
  isRaw?: boolean
  onRetry?: () => void
  onToggleRaw: () => void
}

export const MessageItem = React.memo(({
  message,
  isStreaming = false,
  isWaiting = false,
  isRaw = false,
  onRetry,
  onToggleRaw
}: MessageItemProps) => {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex w-full px-4 min-w-0 overflow-hidden",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? (
        <div className="max-w-[92%] flex flex-col items-end min-w-0 overflow-hidden">
          {message.contexts && message.contexts.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5 mb-2 w-full overflow-hidden">
              {message.contexts.map((ctx) => (
                <ContextPill key={ctx.id} ctx={ctx} />
              ))}
            </div>
          )}
          <div className="bg-[#F8F9FB] border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm overflow-hidden break-words w-fit max-w-full">
            <p className="text-[13px] text-gray-800 leading-relaxed whitespace-normal break-words [overflow-wrap:anywhere]">{message.content}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-[95%] flex flex-col min-w-0 overflow-hidden w-full">
          <ThinkingIndicator isStreaming={isStreaming} isWaiting={isWaiting} />
          <div className="w-full min-w-0 pb-1 overflow-hidden">
            {isRaw ? (
              <pre className="text-[11px] font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 w-full min-w-0 max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-600 leading-relaxed">
                {message.content}
              </pre>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
          <div className="w-full min-w-0">
            <ActionBar 
              content={message.content} 
              onRetry={onRetry} 
              onToggleRaw={onToggleRaw}
              isRaw={isRaw}
            />
          </div>
        </div>
      )}
    </div>
  )
})

MessageItem.displayName = "MessageItem"
