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

      // Ignore tokens if we are in translation mode
      if (state.isTranslating) return

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

  async function translateText(text: string, targetLanguage: string): Promise<string> {
    const state = useStore.getState()
    const { loadedModel, activeWorkspaceId } = state
    let { activeSessionId } = state

    if (!loadedModel) throw new Error("No model loaded")

    // If no active session, try to find one or create one for the active workspace
    if (!activeSessionId && activeWorkspaceId) {
      const sessions = useStore.getState().sessions
      if (sessions.length > 0) {
        activeSessionId = sessions[0].id
        useStore.setState({ activeSessionId })
      } else {
        activeSessionId = await useStore.getState().createSession()
      }
    }

    if (!activeSessionId) throw new Error("No active chat session available. Please open a workspace.")

    let systemPrompt = `Role: You are an expert translator and built-in dictionary module, mimicking the precise, elegant, and minimalist UI style of Apple's "Lookup" and "Translate" system features.

Task: Analyze the input. If it is a single word or short phrase, provide a lexicographical dictionary definition. If it is a full sentence or paragraph, provide a direct, natural translation into ${targetLanguage}. 

Constraint: Do not include any conversational filler, introductory text, or markdown code blocks (\`\`\`). Output ONLY the raw formatted markdown text.

---
CRITERIA 1: If input is a SINGLE WORD / SHORT PHRASE (Dictionary Mode):
Use this exact template:
**[Word/Phrase]**
*[Part of Speech]*

• **[Translation into ${targetLanguage}]** [Core definition in ${targetLanguage}]
  *English Definition:* [Concise English definition]
  
  **Synonyms:** [synonym 1], [synonym 2], [synonym 3]

---
CRITERIA 2: If input is a SENTENCE / PARAGRAPH (Translation Mode):
Do NOT include labels like "Translation:", "Result:", or word breakdowns. Output ONLY the beautifully translated ${targetLanguage} text, ensuring it is contextually accurate, natural, and elegant (matching the style of professional literature). If the text contains multiple paragraphs, maintain the paragraph breaks.
---`

    const prompt = `Now, analyze, translate, and format the following input: "${text}"`

    useStore.getState().setIsTranslating(true)

    return new Promise(async (resolve, reject) => {
      let result = ""
      const unlisten = await listen<TokenPayload>("ai-token", (event) => {
        const { token, is_final } = event.payload

        if (token) {
          result += token
        }

        if (is_final) {
          unlisten()
          useStore.getState().setIsTranslating(false)
          if (result.startsWith("Error:")) {
            reject(new Error(result))
          } else if (result.trim() === "") {
            reject(new Error("Model returned an empty response. Try a different model or prompt."))
          } else {
            resolve(result)
          }
        }
      })

      try {
        if (loadedModel.source === "cloud") {
          await invoke("generate_cloud", {
            sessionId: activeSessionId,
            baseUrl: loadedModel.baseUrl,
            apiKey: loadedModel.apiKey,
            model: loadedModel.modelName,
            messages: [
              { id: "system", role: "system", content: systemPrompt },
              { id: "user", role: "user", content: prompt }
            ],
            maxTokens: 500,
            temperature: 0.3,
            persist: false,
          })
        } else {
          await invoke("generate", {
            sessionId: activeSessionId,
            prompt: `${systemPrompt}\n\nUser: ${prompt}`,
            maxTokens: 500,
            temperature: 0.3,
            persist: false,
          })
        }
      } catch (e) {
        unlisten()
        useStore.getState().setIsTranslating(false)
        reject(e)
      }
    })
  }

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

    setIsGenerating(true)
    setStreamingToken("")

    if (loadedModel.source === "cloud") {
      // Send raw messages and let backend handle enrichment for the API call
      const messages = [
        { id: "system", role: "system" as const, content: "" }, // Placeholder, backend handles system prompt
        ...currentMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content
        }))
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
        persist: true,
      })
    } else {
      await invoke("generate", {
        sessionId: activeSessionId,
        prompt,
        contexts,
        maxTokens,
        temperature,
        persist: true,
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
    translateText,
    stopGeneration,
    listModels,
    downloadModel,
    deleteModel,
    get_model_info,
    testCloudModel,
    chatMessages,
  }
}
