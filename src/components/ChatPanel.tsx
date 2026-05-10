import { useState, useRef, useEffect } from "react"
import { Send, Square, Trash2 } from "lucide-react"
import { useAi } from "../hooks/useAi"
import { useStore } from "../store"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import ReactMarkdown from "react-markdown"

export function ChatPanel() {
  const { generate, stopGeneration } = useAi()
  const { isGenerating, chatMessages, streamingToken, loadedModel, clearChat } = useStore()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, streamingToken])

  async function handleSend() {
    const prompt = input.trim()
    if (!prompt || isGenerating) return
    setInput("")
    await generate(prompt)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">AI Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={clearChat}
          disabled={chatMessages.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-3 p-3">
          {!loadedModel && (
            <p className="text-center text-sm text-muted-foreground">
              Load a model from settings to start chatting
            </p>
          )}

          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Streaming token */}
          {streamingToken && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{streamingToken}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loadedModel ? "Ask about the PDF..." : "Load a model first..."}
            disabled={!loadedModel}
          />
          {isGenerating ? (
            <Button
              variant="destructive"
              size="icon"
              className="shrink-0"
              onClick={stopGeneration}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="shrink-0"
              onClick={handleSend}
              disabled={!loadedModel || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
