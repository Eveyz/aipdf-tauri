import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { useStore, type ModelInfo, type ModelEntry, type ChatMessage } from "../store"

interface TokenPayload {
  token: string
  token_id: number
  is_final: boolean
}

interface CloudTestResult {
  ok: boolean
  message: string
}

let listenersStarted = false

export function useAi() {
  const {
    loadedModel,
    isGenerating,
    setLoadedModel,
    setIsGenerating,
    addChatMessage,
    setStreamingToken,
    chatMessages,
  } = useStore()

  useEffect(() => {
    if (listenersStarted) return
    listenersStarted = true

    listen<TokenPayload>("ai-token", (event) => {
      const { token, is_final } = event.payload
      const state = useStore.getState()

      if (is_final) {
        const current = state.streamingToken
        const content = current || token
        if (content) {
          state.addChatMessage({ role: "assistant", content })
        }
        state.setStreamingToken("")
        state.setIsGenerating(false)
      } else {
        state.appendStreamingToken(token)
      }
    })

    listen("download-progress", (event) => {
      useStore.getState().setDownloadProgress(event.payload as any)
    })
  }, [])

  async function loadModel(modelId: string) {
    const info = await invoke<ModelInfo>("load_model", { modelId })
    setLoadedModel({ ...info, source: "local" })
    return info
  }

  async function unloadModel() {
    await invoke("unload_model")
    setLoadedModel(null)
  }

  async function generate(prompt: string, context?: string, maxTokens?: number, temperature?: number) {
    if (!loadedModel) throw new Error("No model loaded")

    const promptForModel = context
      ? `Use this selected PDF context to answer the user's question.\n\nSelected context:\n${context}\n\nUser question:\n${prompt}`
      : prompt

    addChatMessage({ role: "user", content: prompt })
    setIsGenerating(true)
    setStreamingToken("")

    if (loadedModel.source === "cloud") {
      const messages: ChatMessage[] = [
        ...chatMessages,
        { role: "user", content: promptForModel },
      ]

      await invoke("generate_cloud", {
        baseUrl: loadedModel.baseUrl,
        apiKey: loadedModel.apiKey,
        model: loadedModel.modelName,
        messages,
        maxTokens,
        temperature,
      })
    } else {
      await invoke("generate", { prompt: promptForModel, maxTokens, temperature })
    }
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

  async function testCloudModel(baseUrl: string, apiKey: string, model: string) {
    return await invoke<CloudTestResult>("test_cloud_model", { baseUrl, apiKey, model })
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
    testCloudModel,
    chatMessages,
  }
}
