import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useRef } from "react"
import { useStore, type ModelInfo, type ModelEntry } from "../store"

interface TokenPayload {
  token: string
  token_id: number
  is_final: boolean
}

export function useAi() {
  const {
    loadedModel,
    isGenerating,
    setLoadedModel,
    setIsGenerating,
    addChatMessage,
    setStreamingToken,
    appendStreamingToken,
    setDownloadProgress,
    chatMessages,
  } = useStore()

  const unlistenRef = useRef<(() => void) | null>(null)
  const unlistenDownloadRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Listen for AI tokens
    listen<TokenPayload>("ai-token", (event) => {
      const { token, is_final } = event.payload
      if (is_final) {
        const current = useStore.getState().streamingToken
        if (current) {
          addChatMessage({ role: "assistant", content: current })
        }
        setStreamingToken("")
        setIsGenerating(false)
      } else {
        appendStreamingToken(token)
      }
    }).then((unlisten) => {
      unlistenRef.current = unlisten
    })

    // Listen for download progress
    listen("download-progress", (event) => {
      setDownloadProgress(event.payload as any)
    }).then((unlisten) => {
      unlistenDownloadRef.current = unlisten
    })

    return () => {
      unlistenRef.current?.()
      unlistenDownloadRef.current?.()
    }
  }, [])

  async function loadModel(modelId: string) {
    const info = await invoke<ModelInfo>("load_model", { modelId })
    setLoadedModel(info)
    return info
  }

  async function unloadModel() {
    await invoke("unload_model")
    setLoadedModel(null)
  }

  async function generate(prompt: string, maxTokens?: number, temperature?: number) {
    if (!loadedModel) throw new Error("No model loaded")

    addChatMessage({ role: "user", content: prompt })
    setIsGenerating(true)
    setStreamingToken("")

    await invoke("generate", { prompt, maxTokens, temperature })
  }

  async function stopGeneration() {
    await invoke("stop_generation")
    setIsGenerating(false)
  }

  async function listModels() {
    return await invoke<ModelEntry[]>("list_models")
  }

  async function downloadModel(modelId: string, url: string) {
    await invoke("download_model", { modelId, url })
  }

  async function deleteModel(modelId: string) {
    await invoke("delete_model", { modelId })
  }

  async function get_model_info(modelId: string) {
    return await invoke<ModelEntry>("get_model_info", { modelId })
  }

  return {
    loadedModel,
    isGenerating,
    loadModel,
    unloadModel,
    generate,
    stopGeneration,
    listModels,
    downloadModel,
    deleteModel,
    get_model_info,
    chatMessages,
  }
}
