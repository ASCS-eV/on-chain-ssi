import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [hardhat, sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(import.meta.env.VITE_HARDHAT_RPC_URL || 'http://127.0.0.1:8545'),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL), // Uses public RPC if not set
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
  },
})
