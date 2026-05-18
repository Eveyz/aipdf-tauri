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

      {(streamingToken || isGenerating) && (
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
