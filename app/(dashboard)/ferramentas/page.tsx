"use client"

import { Button } from "@/components/ui/button"
import { Download, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Tool {
    id: string
    name: string
    description: string
    image: string
    downloadUrl: string
    tutorialUrl: string
    tag: string
}

const tools: Tool[] = [
    {
        id: "maps",
        name: "Google Maps Extractor",
        description: "Extração ilimitada de empresas direto do Google Maps.",
        image: "/maps.png",
        downloadUrl: "https://prospektia.com/download/extensao-google-maps.crx",
        tutorialUrl: "https://youtu.be/geZAy3I2jZs", // Placeholder
        tag: "BESTSELLER"
    },
    {
        id: "instagram",
        name: "Instagram Hunter",
        description: "Encontre leads qualificados no Instagram automaticamente.",
        image: "/instagram.png",
        downloadUrl: "https://prospektia.com/download/instagram-prospektia.crx",
        tutorialUrl: "https://youtu.be/4f56NtAHLko", // Placeholder
        tag: "POPULAR"
    },
    {
        id: "cnpj",
        name: "CNPJ Finder",
        description: "Busca completa de dados corporativos via CNPJ.",
        image: "/cnpj.png",
        downloadUrl: "https://prospektia.com/download/Prospektia-CNPJ-Extrator-Leads.crx",
        tutorialUrl: "https://youtu.be/HxExnT3ooSU", // Placeholder
        tag: "NOVO"
    }
]

export default function FerramentasPage() {
    return (
        <div className="space-y-8 p-1">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Ferramentas
                </h1>
                <p className="text-muted-foreground">
                    Baixe nossas extensões e potencialize sua prospecção.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tools.map((tool) => (
                    <div key={tool.id} className="group flex flex-col gap-3">
                        {/* Card Container */}
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:border-primary/50">

                            {/* Cover Image with Zoom Effect */}
                            <div className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-110">
                                <Image
                                    src={tool.image}
                                    alt={tool.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Dark Overlay on Hover */}
                            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-6 text-center">

                                {/* Description */}
                                <p className="text-sm text-gray-200 mb-6 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 delay-75">
                                    {tool.description}
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 w-full max-w-[200px] translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 delay-100">
                                    {/* OBTER Button */}
                                    <Link href={tool.downloadUrl} target="_blank">
                                        <Button className="w-full relative bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-shadow">
                                            <Download className="mr-2 h-4 w-4" />
                                            OBTER
                                        </Button>
                                    </Link>

                                    {/* Tutorial Button */}
                                    <Link href={tool.tutorialUrl} target="_blank">
                                        <Button variant="outline" className="w-full bg-black/40 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Ver Tutorial
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Tag (Optional Visual flair) */}
                            <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-wider text-white">
                                    {tool.tag}
                                </div>
                            </div>

                        </div>

                        {/* Tool Name Below Card */}
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-medium text-lg text-foreground/90 group-hover:text-primary transition-colors">
                                {tool.name}
                            </h3>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
