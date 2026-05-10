import { useEffect, useRef, useState } from "react"
import { Send, Square, Trash2, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useAi } from "../hooks/useAi"
import { useStore } from "../store"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

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
    selectedPdfText,
    setSelectedPdfText,
  } = useStore()
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
    await generate(prompt, selectedPdfText || undefined)
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h3 className="shrink-0 text-sm font-medium">AI Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={clearChat}
          disabled={chatMessages.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
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
                className={`max-w-[85%] overflow-hidden rounded-lg px-3 py-2 text-sm break-words ${
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

          {streamingToken && (
            <div className="flex justify-start">
              <div className="max-w-[85%] overflow-hidden rounded-lg bg-muted px-3 py-2 text-sm break-words">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{streamingToken}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-3">
        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          {selectedPdfText && (
            <div className="border-b bg-muted/50 px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Selected PDF context
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {selectedPdfText}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setSelectedPdfText("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <textarea
            className="min-h-20 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loadedModel ? "Ask about the PDF..." : "Load a model first..."}
            disabled={!loadedModel}
          />

          <div className="flex items-center gap-2 border-t px-2 py-2">
            <Select value={loadedModel?.id} onValueChange={handleModelSelect}>
              <SelectTrigger className="h-8 min-w-0 flex-1 border-0 px-2 shadow-none">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {loadedModel?.source === "local" && (
                  <SelectItem value={loadedModel.id}>{loadedModel.name}</SelectItem>
                )}
                {cloudModels.map((model) => (
                  <SelectItem key={model.id} value={`cloud:${model.id}`}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
    </div>
  )
}
