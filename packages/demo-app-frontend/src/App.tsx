import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useChainId, useSwitchChain } from 'wagmi'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { config } from './lib/wagmi'
import { Toaster } from 'sonner'
import { Navigate } from 'react-router-dom'
import { TrustAnchorLayout } from './components/layout/TrustAnchorLayout'
import { CompanyLayout } from './components/layout/CompanyLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

import { HomePage } from './pages/Home'
import { TrustAnchorDashboard } from './pages/trust-anchor/Dashboard'
import { CompaniesPage } from './pages/trust-anchor/Companies'
import { GovernancePage } from './pages/trust-anchor/Governance'
import { CompanyOnboardingPage } from './pages/company/Onboarding'
import { RevocationListPage } from './pages/company/RevocationList'
import { AlertTriangle } from 'lucide-react'

const queryClient = new QueryClient()

// Simple Network Checker Component
function NetworkChecker() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  // 11155111 is Sepolia, 31337 is Hardhat. Adjust as needed for Tezos Etherlink ID if different.
  const supportedChains = [31337, 11155111] 

  if (!supportedChains.includes(chainId)) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-[100]">
        <AlertTriangle className="w-4 h-4" />
        <span>Unsupported Network.</span>
        <button 
          onClick={() => switchChain({ chainId: 11155111 })}
          className="underline hover:text-amber-100"
        >
          Switch to Sepolia
        </button>
      </div>
    )
  }
  return null
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Toast Notification Container */}
        <Toaster position="top-right" richColors closeButton />
        
        <BrowserRouter>
          <NetworkChecker />
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/trust-anchor/*" element={
              <ProtectedRoute requiredRole="admin">
                <TrustAnchorLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<TrustAnchorDashboard />} />
                    <Route path="companies" element={<CompaniesPage />} />
                    <Route path="governance" element={<GovernancePage />} />
                  </Routes>
                </TrustAnchorLayout>
              </ProtectedRoute>
            } />

            <Route path="/company/*" element={
              <ProtectedRoute requiredRole="company">
                <CompanyLayout>
                  <Routes>
                    <Route path="/onboarding" element={<CompanyOnboardingPage />} />
                    <Route path="/revocations" element={<RevocationListPage />} />
                  </Routes>
                </CompanyLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App