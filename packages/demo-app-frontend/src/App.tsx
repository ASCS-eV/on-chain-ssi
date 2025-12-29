import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { config } from './lib/wagmi'
import { TrustAnchorLayout } from './components/layout/TrustAnchorLayout'
import { CompanyLayout } from './components/layout/CompanyLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

import { HomePage } from './pages/Home'
import { TrustAnchorDashboard } from './pages/trust-anchor/Dashboard'
import { CompaniesPage } from './pages/trust-anchor/Companies'
import { GovernancePage } from './pages/trust-anchor/Governance' // <-- Import
import { CompanyOnboardingPage } from './pages/company/Onboarding'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/trust-anchor/*" element={
              <ProtectedRoute requiredRole="admin">
                <TrustAnchorLayout>
                  <Routes>
                    <Route path="/" element={<TrustAnchorDashboard />} />
                    <Route path="/companies" element={<CompaniesPage />} />
                    <Route path="/governance" element={<GovernancePage />} /> {/* <-- New Route */}
                  </Routes>
                </TrustAnchorLayout>
              </ProtectedRoute>
            } />

            <Route path="/company/*" element={
              <ProtectedRoute requiredRole="company">
                <CompanyLayout>
                  <Routes>
                    <Route path="/onboarding" element={<CompanyOnboardingPage />} />
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