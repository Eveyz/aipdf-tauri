import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { useStore } from "../store"

interface TokenPayload {
  token: string
  token_id: number
  is_final: boolean
}

let listenersStarted = false

export function useAiListeners() {
  useEffect(() => {
    if (listenersStarted) return
    listenersStarted = true

    const setupListeners = async () => {
      const unlistenToken = await listen<TokenPayload>("ai-token", (event) => {
        const { token, is_final } = event.payload
        const state = useStore.getState()

        // Ignore tokens if we are in translation mode (handled by store.translateText)
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

      const unlistenProgress = await listen("download-progress", (event) => {
        useStore.getState().setDownloadProgress(event.payload as any)
      })

      return () => {
        unlistenToken()
        unlistenProgress()
        listenersStarted = false
      }
    }

    setupListeners()
  }, [])
}
