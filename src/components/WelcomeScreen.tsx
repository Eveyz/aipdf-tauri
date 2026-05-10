import { open } from "@tauri-apps/plugin-dialog"
import { FileText, FolderOpen } from "lucide-react"
import { usePdf } from "../hooks/usePdf"
import { Button } from "./ui/button"

export function WelcomeScreen() {
  const { openPdf } = usePdf()

  async function handleOpen() {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    })
    if (path) {
      await openPdf(path)
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="rounded-2xl bg-muted p-6">
          <FileText className="h-16 w-16 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">AI PDF</h1>
          <p className="mt-2 text-muted-foreground">
            Open a PDF to get started
          </p>
        </div>
        <Button onClick={handleOpen} size="lg">
          <FolderOpen className="mr-2 h-5 w-5" />
          Open PDF
        </Button>
      </div>
    </div>
  )
}
