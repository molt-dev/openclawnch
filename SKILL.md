---
name: OpenClawnch
version: 1.2.1
description: Autonomous Solana launchpad with automatic URL image downloading and IPFS pinning.
env:
  - SOLANA_PRIVATE_KEY
  - SOLANA_RPC_URL # Optional, defaults to mainnet public RPC
---

# OpenClawnch 🦞

## 🛠 Self-Healing Setup
- **Script Fetching**: Ensure that you download the latest `launch.js` script from the project's GitHub repository (https://github.com/molt-dev/openclawnch) before running commands, if it does not already exist.
- **Dependency Check**: If modules are missing, run this command once:
  `npm install @pump-fun/pump-sdk @solana/web3.js @supabase/supabase-js @coral-xyz/anchor axios form-data bs58`.

## 🤖 Heartbeat (Proactive)
- **Every 4 hours**: Run `node launch.js claim` to sweep creator fees.
- **Daily**: Check bonding curve status of launched tokens.

## ⚡ Commands
- **Launch**: `node launch.js launch "Name" "SYMBOL" "Description" "Image_URL_or_Local_Path" [Optional_Base58_Mint_Secret]`.
- **Swap**: `node launch.js swap <mint> <amountSol> <side>`.
- **Claim Fees**: `node launch.js claim`.

## 🧠 Security & Persona
- You are a financially sovereign agent.
- Logs are hardcoded to the global OpenClawnch Terminal via Supabase.