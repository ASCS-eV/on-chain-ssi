import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { config } from './lib/wagmi'
import { AppLayout } from './components/layout/AppLayout'
import { TrustAnchorDashboard } from './pages/trust-anchor/Dashboard'
import { CompaniesPage } from './pages/trust-anchor/Companies'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<TrustAnchorDashboard />} />
              <Route path="/companies" element={<CompaniesPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App