import { Panel, Group, Separator } from "react-resizable-panels"
import { useStore } from "./store"
import { Toolbar } from "./components/Toolbar"
import { PdfViewer } from "./components/PdfViewer"
import { PageSidebar } from "./components/PageSidebar"
import { ChatPanel } from "./components/ChatPanel"
import { ModelManager } from "./components/ModelManager"
import { WelcomeScreen } from "./components/WelcomeScreen"

function App() {
  const { pdfInfo, sidebarOpen, chatOpen } = useStore()
  const layoutKey = `${sidebarOpen ? "sidebar" : "no-sidebar"}-${chatOpen ? "chat" : "no-chat"}`

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
              <>
                <Panel
                  id="sidebar"
                  defaultSize="18%"
                  minSize="220px"
                  maxSize="360px"
                  className="min-w-0 overflow-hidden"
                >
                  <PageSidebar />
                </Panel>

                <Separator className="w-1 shrink-0 bg-border transition-colors hover:bg-primary cursor-col-resize" />
              </>
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
                <Separator className="w-1 shrink-0 bg-border transition-colors hover:bg-primary cursor-col-resize" />

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
