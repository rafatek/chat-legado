"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, Sparkles, ArrowUpRight } from "lucide-react"

interface OnboardingTourProps {
    onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-end p-6 bg-black/60 backdrop-blur-[2px]"
            >
                <div className="absolute inset-0 z-0" onClick={onComplete} />

                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="relative z-10 w-full max-w-sm mt-20 mr-4"
                >
                    {/* Connecting Line/Arrow to the button */}
                    <div className="absolute -top-16 right-8 flex flex-col items-center">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 40 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="w-0.5 bg-gradient-to-b from-blue-500 to-transparent"
                        />
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)]" />
                        </motion.div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0C]/90 shadow-2xl backdrop-blur-xl">
                        {/* Animated Border Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 animate-gradient-xy opacity-50" />

                        <div className="relative p-6 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <Sparkles className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h3 className="font-bold text-lg text-white tracking-tight">
                                        Bem-vindo ao Prospekt<span className="text-blue-400">IA</span>
                                    </h3>
                                </div>
                                <button
                                    onClick={onComplete}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    Preparamos um material exclusivo para você dominar nossa ferramenta.
                                </p>
                                <p className="text-sm text-gray-400">
                                    Sempre que tiver dúvidas sobre uma tela, clique em <strong className="text-white">Ver Tutorial</strong> para assistir a um guia rápido e prático.
                                </p>
                            </div>

                            <div className="pt-2">
                                <Button
                                    onClick={onComplete}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-900/20"
                                >
                                    Entendi, vamos começar!
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
