import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { Plus } from "lucide-react"
import { cn } from "../../lib/utils"
import { useStore } from "../../store"
import { ContextPill } from "./MessageItem"
import { useChatContextMenu } from "../../hooks/useChatContextMenu"
import { ChatInputToolbar } from "./ChatInputToolbar"
import { ChatContextMenu } from "./ChatContextMenu"

interface ChatInputProps {
  onSend: (content: string) => void
  onAddCurrentPage: () => void
  onAddFullDocument: () => void
}

export const ChatInput = React.memo(({
  onSend,
  onAddCurrentPage,
  onAddFullDocument
}: ChatInputProps) => {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const loadedModel = useStore(state => state.loadedModel)
  const chatContexts = useStore(state => state.chatContexts)
  const removeChatContext = useStore(state => state.removeChatContext)

  const {
    showContextMenu,
    setShowContextMenu,
    menuSelectedIndex,
    contextMenuRef,
    handleSelectMenuItem,
    handleKeyDown: handleMenuKeyDown,
    onInputChange: onMenuInputChange,
  } = useChatContextMenu({ 
    input, 
    setInput, 
    onAddCurrentPage, 
    onAddFullDocument 
  })

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim()
    if (!trimmedInput || !loadedModel) return
    onSend(trimmedInput)
    setInput("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "100px"
    }
  }, [input, loadedModel, onSend])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const newHeight = Math.max(100, Math.min(textareaRef.current.scrollHeight, 400))
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleMenuKeyDown(e)) return

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleMenuKeyDown, handleSend])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInput(newValue)
    onMenuInputChange(newValue)
  }, [onMenuInputChange])

  return (
    <div className="shrink-0 w-full p-4 pt-0">
      <div className="relative w-full">
        {showContextMenu && (
          <ChatContextMenu 
            ref={contextMenuRef}
            selectedIndex={menuSelectedIndex}
            onSelect={handleSelectMenuItem}
          />
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
            ref={textareaRef}
            className="h-[100px] w-full resize-none bg-transparent px-3.5 py-3 text-[13px] font-normal outline-none placeholder:text-gray-400 leading-relaxed overflow-y-auto"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={loadedModel ? "Ask a question or type @ to add context..." : "Load a model first..."}
            disabled={!loadedModel}
          />

          <ChatInputToolbar 
            input={input}
            onSend={handleSend}
            showContextMenu={showContextMenu}
            setShowContextMenu={setShowContextMenu}
          />
        </div>
      </div>
    </div>
  )
})

ChatInput.displayName = "ChatInput"
