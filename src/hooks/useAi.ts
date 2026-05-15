import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { useStore, type ModelInfo, type ModelEntry, type ChatContext } from "../store"

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
          state.addChatMessage({ id: crypto.randomUUID(), role: "assistant", content })
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

  async function generate(prompt: string, contexts?: ChatContext[], maxTokens?: number, temperature?: number) {
    const state = useStore.getState()
    const { loadedModel, activeSessionId, chatMessages: currentMessages } = state
    if (!loadedModel) throw new Error("No model loaded")
    if (!activeSessionId) throw new Error("No active session")

    const systemPrompt = "You are a helpful AI assistant analyzing a PDF document. Always format your responses in clear, professional Markdown. Use headings, lists, and bold text where appropriate to make your answers easy to read."

    const contextText = contexts && contexts.length > 0
      ? contexts.map(c => c.label ? `${c.label}:\n${c.content}` : c.content).join("\n\n")
      : undefined

    const promptForModel = contextText
      ? `Use this selected PDF context to answer the user's question.\n\nSelected context:\n${contextText}\n\nUser question:\n${prompt}`
      : prompt

    setIsGenerating(true)
    setStreamingToken("")

    if (loadedModel.source === "cloud") {
      // Find the last user message to replace its content with the enriched prompt for the API call
      // but keep other messages as is.
      const messages = [
        { id: "system", role: "system" as const, content: systemPrompt },
        ...currentMessages.map((m, idx) => {
          // If this is the last message and it's from the user, use the enriched prompt
          if (idx === currentMessages.length - 1 && m.role === "user") {
            return { id: m.id, role: m.role, content: promptForModel }
          }
          return { id: m.id, role: m.role, content: m.content }
        })
      ]

      await invoke("generate_cloud", {
        sessionId: activeSessionId,
        baseUrl: loadedModel.baseUrl,
        apiKey: loadedModel.apiKey,
        model: loadedModel.modelName,
        messages,
        contexts,
        maxTokens,
        temperature,
      })
    } else {
      await invoke("generate", { 
        sessionId: activeSessionId,
        prompt: promptForModel, 
        contexts,
        maxTokens, 
        temperature 
      })
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
