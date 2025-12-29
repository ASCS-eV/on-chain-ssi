import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { ArrowRight, Loader2, Shield, Globe, Lock, Cpu } from 'lucide-react'
import { useTrustAnchorData } from '../hooks/useTrustAnchor'

// --- SCROLL REVEAL COMPONENT ---
function RevealOnScroll({ children, delay = 0 }: { children: ReactNode, delay?: number }) {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true)
                observer.disconnect() // Reveal once
            }
        }, { threshold: 0.1 })

        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-700 transform ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

export function HomePage() {
  const navigate = useNavigate()
  const { address, isConnected, isConnecting } = useAccount()
  const { connect } = useConnect()
  const { owners, isLoading: isTaLoading } = useTrustAnchorData()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // --- AUTO-REDIRECT LOGIC ---
  useEffect(() => {
    if (isConnected && !isTaLoading && owners && address) {
      const isTrustAnchorAdmin = owners.some(
        (owner) => owner.toLowerCase() === address.toLowerCase()
      )
      if (isTrustAnchorAdmin) {
        navigate('/trust-anchor')
      } else {
        navigate('/company/onboarding')
      }
    }
  }, [isConnected, isTaLoading, owners, address, navigate])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-600 p-2 rounded-lg">
                 <Shield className="w-6 h-6 text-white" />
               </div>
               <span className="font-bold text-xl tracking-tight text-slate-900">Etherlink SSI</span>
            </div>
            
            {!isConnected && (
                <button 
                    onClick={() => connect({ connector: injected() })}
                    className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                    Connect Wallet
                </button>
            )}
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Text Content */}
            <RevealOnScroll>
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                        <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Live on Tezos Etherlink
                    </div>
                    
                    <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1]">
                        The Future of <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                            Corporate Identity
                        </span>
                    </h1>
                    
                    <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                        A decentralized, on-chain governance framework for Verifiable Credentials. 
                        Establish trust, manage DIDs, and secure your company's digital sovereignty 
                        with the power of Etherlink.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {isConnected ? (
                            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm animate-pulse">
                                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                <span className="font-medium text-slate-700">Accessing Portal...</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => connect({ connector: injected() })}
                                disabled={isConnecting}
                                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-slate-900 border border-transparent rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-lg shadow-slate-900/20 hover:-translate-y-1"
                            >
                                {isConnecting ? 'Connecting...' : 'Launch App'}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        )}
                    </div>
                </div>
            </RevealOnScroll>

            {/* Right: Feature Grid Visual */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 to-violet-100/50 rounded-3xl -rotate-6 blur-3xl opacity-70"></div>
                <div className="relative grid grid-cols-2 gap-4">
                    
                    <RevealOnScroll delay={100}>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 h-full">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Global Reach</h3>
                                <p className="text-sm text-slate-500 mt-1">Cross-border identity verification standard compliant with W3C.</p>
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay={200}>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 h-full mt-8 md:mt-12">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Secure by Design</h3>
                                <p className="text-sm text-slate-500 mt-1">Multi-signature governance prevents single points of failure.</p>
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay={300}>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 h-full">
                            <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">On-Chain Logic</h3>
                                <p className="text-sm text-slate-500 mt-1">Transparent execution via Smart Contracts on Etherlink.</p>
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay={400}>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 h-full mt-8 md:mt-12">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Self-Sovereign</h3>
                                <p className="text-sm text-slate-500 mt-1">Companies retain full cryptographic control of their data.</p>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-900">Etherlink SSI</span>
            </div>
            
            <div className="text-sm text-slate-500 font-medium">
                &copy; 2026 ASC-S e.V. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  )
}