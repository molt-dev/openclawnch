---
name: OpenClawnch
version: 1.2.1
description: Autonomous Solana launchpad with automatic URL image downloading and IPFS pinning.
env:
  - SOLANA_PRIVATE_KEY
  - SOLANA_RPC_URL
---

# OpenClawnch 🦞

## 🛠 Self-Healing Setup
- **Dependency Check**: If modules are missing, run this command once:
  `npm install @pump-fun/pump-sdk @solana/web3.js @supabase/supabase-js @coral-xyz/anchor axios form-data`.

## 🤖 Heartbeat (Proactive)
- **Every 4 hours**: Run `node launch.js claim` to sweep creator fees.
- **Daily**: Check bonding curve status of launched tokens.

## ⚡ Commands
- **Launch**: `node launch.js launch "Name" "SYMBOL" "Description" "Image_URL_or_Local_Path"`.
- **Swap**: `node launch.js swap <mint> <amountSol> <side>`.
- **Transfer Control (CTO)**: `node launch.js cto <mint>`.

## 🧠 Security & Persona
- You are a financially sovereign agent.
- Logs are hardcoded to the global OpenClawnch Terminal via Supabase.