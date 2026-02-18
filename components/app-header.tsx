"use client"

import { Button } from "@/components/ui/button"
import { PlayCircle, X } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { OnboardingTour } from "@/components/onboarding-tour"

// Mapeamento de rotas para links de tutorial
const TUTORIAL_LINKS: Record<string, string> = {
  "/dashboard": "https://youtu.be/MPCgdYWaanY",
  "/leads": "https://youtu.be/8gtc47BCyjo",
  "/crm": "https://youtu.be/MfCrCOlJuPA",
  "/campanhas": "https://youtu.be/AmQAzkE10vs",
  "/conexoes": "https://youtu.be/sJFOEWAbiEY",
  "/agente": "https://youtu.be/UEUf6qbG_p0",
  "/ferramentas": "https://youtu.be/wkH6ubS3cxk",
  "/conta": "https://youtu.be/1AvdUmQET_w",
  "/suporte": "https://youtu.be/lEqpDwwN9i0",
}

// Função para extrair o ID do vídeo do YouTube
const getVideoId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

export function AppHeader() {
  const pathname = usePathname()

  // Busca o link exato ou usa um fallback (atualmente todos apontam para o mesmo vídeo de teste)
  const videoUrl = TUTORIAL_LINKS[pathname] || TUTORIAL_LINKS["/dashboard"]
  const videoId = getVideoId(videoUrl)

  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    // Check if tour has been seen
    const hasSeenTour = localStorage.getItem("prospektia_tutorial_tour_seen")
    if (!hasSeenTour) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowTour(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleTourComplete = () => {
    localStorage.setItem("prospektia_tutorial_tour_seen", "true")
    setShowTour(false)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-end px-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className={`gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 ${showTour ? 'relative z-[60] ring-4 ring-blue-500/50 ring-offset-2 ring-offset-[#09090b]' : ''}`}
            >
              <PlayCircle className="h-4 w-4" />
              Ver Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="sm:max-w-[800px] p-0 overflow-hidden bg-black/90 border-zinc-800">
            <DialogHeader className="flex flex-row items-center justify-between p-4 absolute z-10 w-full bg-gradient-to-b from-black/80 to-transparent">
              <DialogTitle className="text-white text-lg font-medium tracking-tight">
                Tutorial da Página
              </DialogTitle>
              <DialogClose className="rounded-full p-1 hover:bg-white/10 transition-colors text-white cursor-pointer z-50">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogHeader>
            <div className="aspect-video w-full bg-black">
              {videoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title="Tutorial Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-zinc-400">
                  Vídeo indisponível
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {showTour && <OnboardingTour onComplete={handleTourComplete} />}
    </header>
  )
}
