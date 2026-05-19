import { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useStore } from '../store'

export interface AgentProgress {
  step: string
  detail: string
  isFinal: boolean
}

export function useAgent() {
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [progress, setProgress] = useState<AgentProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const currentWorkspace = useStore(state => state.currentWorkspace)

  useEffect(() => {
    const unlistenProgress = listen<AgentProgress>('agent-progress', (event) => {
      setProgress(prev => [...prev, event.payload])
      if (event.payload.isFinal) {
        setIsAgentRunning(false)
      }
    })

    const unlistenError = listen<string>('agent-error', (event) => {
      setError(event.payload)
      setIsAgentRunning(false)
    })

    return () => {
      unlistenProgress.then(f => f())
      unlistenError.then(f => f())
    }
  }, [])

  async function startAgent(prompt: string) {
    if (!currentWorkspace) return
    
    // For now, we assume a cloud model is configured and we use it
    // In a real scenario, you'd fetch the selected model config from the store/DB
    const modelConfig = {
        vendor: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: "YOUR_API_KEY", // This should come from settings
        modelName: "gpt-4o"
    }

    setIsAgentRunning(true)
    setProgress([])
    setError(null)

    try {
      await invoke('start_agent_task', {
        workspaceId: currentWorkspace.id,
        prompt,
        modelConfig
      })
    } catch (e) {
      setError(String(e))
      setIsAgentRunning(false)
    }
  }

  return {
    isAgentRunning,
    progress,
    error,
    startAgent
  }
}
