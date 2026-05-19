import React, { useCallback } from "react"
import Send from "lucide-react/dist/esm/icons/send"
import Square from "lucide-react/dist/esm/icons/square"
import Plus from "lucide-react/dist/esm/icons/plus"
import MessageSquare from "lucide-react/dist/esm/icons/message-square"
import Sparkles from "lucide-react/dist/esm/icons/sparkles"
import { cn } from "../../lib/utils"
import { useStore } from "../../store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

interface ChatInputToolbarProps {
  isEmpty: boolean
  onSend: () => void
  showContextMenu: boolean
  setShowContextMenu: (show: boolean) => void
}

export const ChatInputToolbar = React.memo(({
  isEmpty,
  onSend,
  showContextMenu,
  setShowContextMenu
}: ChatInputToolbarProps) => {
  const isGenerating = useStore(state => state.isGenerating)
  const loadedModel = useStore(state => state.loadedModel)
  const cloudModels = useStore(state => state.cloudModels)
  const setLoadedModel = useStore(state => state.setLoadedModel)
  const chatMode = useStore(state => state.chatMode)
  const setChatMode = useStore(state => state.setChatMode)
  const stopGeneration = useStore(state => state.stopGeneration)

  const handleModelSelect = useCallback((value: string) => {
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
  }, [cloudModels, setLoadedModel])

  return (
    <div className="flex items-center justify-between px-2.5 py-2 bg-gray-50/50 border-t border-gray-100">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <button
          onClick={() => setShowContextMenu(!showContextMenu)}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all shrink-0",
            showContextMenu && "bg-gray-100 text-gray-600"
          )}
          title="Add context"
        >
          <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200", showContextMenu && "rotate-45")} />
        </button>

        <Select value={chatMode} onValueChange={(v: any) => setChatMode(v)}>
          <SelectTrigger className="h-7 w-7 border-0 p-0 text-[11px] font-medium shadow-none bg-transparent hover:bg-gray-100 rounded-md transition-all focus:ring-0 flex items-center justify-center shrink-0 [&>svg]:hidden">
            <SelectValue>
              {chatMode === "ask" ? (
                <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[100px]">
            <SelectItem value="ask" className="text-xs py-1.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span>Ask</span>
              </div>
            </SelectItem>
            <SelectItem value="agent" className="text-xs py-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Agent</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />

        <Select value={loadedModel?.id} onValueChange={handleModelSelect}>
          <SelectTrigger className="h-7 min-w-0 max-w-[150px] border-0 px-2 py-0 text-[11px] font-medium shadow-none bg-transparent hover:bg-gray-100 rounded-md transition-all gap-1.5 focus:ring-0">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="max-w-[240px]">
            {loadedModel?.source === "local" && (
              <SelectItem value={loadedModel.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="truncate">{loadedModel.name}</span>
                </div>
              </SelectItem>
            )}
            {cloudModels.map((model) => (
              <SelectItem
                key={model.id}
                value={`cloud:${model.id}`}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="truncate">{model.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
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
              "h-7 w-7 flex items-center justify-center rounded-md transition-all shrink-0",
              !loadedModel || isEmpty
                ? "text-gray-300 cursor-not-allowed"
                : "text-blue-600 hover:bg-blue-50 active:scale-[0.98]"
            )}
            onClick={onSend}
            disabled={!loadedModel || isEmpty}
            title="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
})

ChatInputToolbar.displayName = "ChatInputToolbar"
