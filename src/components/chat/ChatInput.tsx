import React, { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, Trash2, Plus } from "lucide-react"
import { cn } from "../../lib/utils"
import { useStore } from "../../store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { ContextPill } from "./MessageItem"

interface ChatInputProps {
  onSend: (content: string) => void
  onAddCurrentPage: () => void
  onAddFullDocument: () => void
}

export function ChatInput({
  onSend,
  onAddCurrentPage,
  onAddFullDocument
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuSelectedIndex, setMenuSelectedIndex] = useState(0)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  
  const {
    isGenerating,
    loadedModel,
    cloudModels,
    setLoadedModel,
    chatContexts,
    removeChatContext,
    clearChat,
    stopGeneration,
    currentPage,
    chatMessages
  } = useStore()

  // Menu items configuration
  const menuItems = [
    { id: 'page', label: 'Current Page', shortcut: `p.${currentPage + 1}`, action: onAddCurrentPage },
    { id: 'doc', label: 'Full Document', shortcut: 'PDF', action: onAddFullDocument },
  ]

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

  // Auto-hide menu if @ is deleted
  useEffect(() => {
    if (showContextMenu && !input.includes("@")) {
      setShowContextMenu(false)
    }
  }, [input, showContextMenu])

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isGenerating || !loadedModel) return
    onSend(trimmedInput)
    setInput("")
  }, [input, isGenerating, loadedModel, onSend])

  const handleSelectMenuItem = useCallback((index: number) => {
    const item = menuItems[index]
    if (item) {
      item.action()
      setShowContextMenu(false)
      setInput(prev => prev.replace(/@$/, ""))
    }
  }, [menuItems, onAddCurrentPage, onAddFullDocument])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showContextMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMenuSelectedIndex(prev => (prev + 1) % menuItems.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMenuSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        handleSelectMenuItem(menuSelectedIndex)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowContextMenu(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInput(newValue)
    
    // Simple logic to show menu if last char is @
    if (newValue.endsWith("@")) {
      setShowContextMenu(true)
      setMenuSelectedIndex(0) // Default to first item
    } else if (showContextMenu && !newValue.includes("@")) {
      setShowContextMenu(false)
    }
  }

  const handleModelSelect = (value: string) => {
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
    <div className="shrink-0 w-full p-4 pt-0">
      <div className="relative w-full">
        {showContextMenu && (
          <div 
            ref={contextMenuRef}
            className="absolute bottom-full left-0 mb-1.5 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight">Attach Context</div>
            {menuItems.map((item, idx) => (
              <button 
                key={item.id}
                onClick={() => handleSelectMenuItem(idx)}
                onMouseEnter={() => setMenuSelectedIndex(idx)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                  menuSelectedIndex === idx ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                <span className={cn(
                  "text-[10px] font-mono",
                  menuSelectedIndex === idx ? "text-blue-400" : "text-gray-400"
                )}>{item.shortcut}</span>
              </button>
            ))}
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
            onChange={handleInputChange}
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
  )
}
