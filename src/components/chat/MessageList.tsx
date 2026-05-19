import React, { useMemo } from "react"
import { useStore } from "../../store"
import { MessageItem } from "./MessageItem"

interface MessageListProps {
  onRetry: (index: number) => void
  onToggleRaw: (id: string) => void
  rawMessageIds: Set<string>
}

export const MessageList = React.memo(({ onRetry, onToggleRaw, rawMessageIds }: MessageListProps) => {
  const chatMessages = useStore(state => state.chatMessages)
  const streamingToken = useStore(state => state.streamingToken)
  const isGenerating = useStore(state => state.isGenerating)
  const chatMode = useStore(state => state.chatMode)
  const agentProgress = useStore(state => state.agentProgress)

  const latestProgress = agentProgress[agentProgress.length - 1]

  return (
    <>
      {chatMessages.map((msg, idx) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onRetry={() => onRetry(idx)}
          onToggleRaw={() => onToggleRaw(msg.id)}
          isRaw={rawMessageIds.has(msg.id)}
        />
      ))}

      {chatMode === "agent" && isGenerating && latestProgress && (
        <div className="mx-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{latestProgress.step}</span>
          </div>
          <p className="text-xs text-blue-900/70 font-medium leading-tight pl-4">
            {latestProgress.detail}
          </p>
        </div>
      )}

      {(streamingToken || (isGenerating && chatMode === "ask")) && (
        <MessageItem
          message={{
            id: "streaming",
            role: "assistant",
            content: streamingToken || "",
          }}
          isStreaming={!!streamingToken}
          isWaiting={!streamingToken}
          onToggleRaw={() => onToggleRaw("streaming")}
          isRaw={rawMessageIds.has("streaming")}
        />
      )}
    </>
  )
})

MessageList.displayName = "MessageList"
