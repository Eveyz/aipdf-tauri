import { useEffect } from "react"
import { Panel, Group, Separator } from "react-resizable-panels"
import { useStore } from "./store"
import { Toolbar } from "./components/Toolbar"
import { PdfViewer } from "./components/PdfViewer"
import { DocumentSidebar } from "./components/DocumentSidebar"
import { ChatPanel } from "./components/ChatPanel"
import { ModelManager } from "./components/ModelManager"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { useAi } from "./hooks/useAi"
import { usePdf } from "./hooks/usePdf"
import { invoke } from "@tauri-apps/api/core"

function App() {
  const { pdfInfo, sidebarOpen, chatOpen, init } = useStore()
  const { loadModel } = useAi()
  const layoutKey = `${sidebarOpen ? "sidebar" : "no-sidebar"}-${chatOpen ? "chat" : "no-chat"}`

  const { openPdf } = usePdf()

  useEffect(() => {
    const startup = async () => {
      await init()
      
      // Load last used model
      try {
        const lastModelId = await invoke<string | null>("get_setting", { key: "last_used_model_id" })
        if (lastModelId) {
          await loadModel(lastModelId)
        }

        const lastPdf = useStore.getState().lastPdfPath
        if (lastPdf) {
          await openPdf(lastPdf)
        }
      } catch (e) {
        console.error("Failed to load last used model or PDF:", e)
      }
    }
    startup()
  }, [])

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden">
      <Toolbar />

      <div className="min-h-0 flex-1 overflow-hidden">
        {!pdfInfo ? (
          <WelcomeScreen />
        ) : (
          <Group
            key={layoutKey}
            orientation="horizontal"
            className="h-full min-w-0"
          >
            {sidebarOpen && (
              <Panel
                id="sidebar"
                defaultSize="18%"
                minSize="220px"
                maxSize="360px"
                className="min-w-0 overflow-hidden border-r border-gray-200"
              >
                <DocumentSidebar />
              </Panel>
            )}

            <Panel
              id="pdf"
              defaultSize={sidebarOpen && chatOpen ? "58%" : "76%"}
              minSize="320px"
              className="min-w-0 overflow-hidden"
            >
              <PdfViewer />
            </Panel>

            {chatOpen && (
              <>
                <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-primary cursor-col-resize" />

                <Panel
                  id="chat"
                  defaultSize="24%"
                  minSize="280px"
                  maxSize="480px"
                  className="min-w-0 overflow-hidden"
                >
                  <ChatPanel />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>

      <ModelManager />
    </div>
  )
}

export default App
