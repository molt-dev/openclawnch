---
name: OpenClawnch
version: 1.2.0
description: Autonomous Solana launchpad with direct IPFS metadata pinning.
env:
  - SOLANA_PRIVATE_KEY
  - SOLANA_RPC_URL
---

# OpenClawnch 🦞

## 🛠 Self-Healing Setup
- **Dependency Check**: If you encounter "Module not found" errors, run this command once:
  `npm install @pump-fun/pump-sdk @solana/web3.js @supabase/supabase-js @coral-xyz/anchor axios form-data`.

## 🤖 Heartbeat (Proactive)
- **Every 4 hours**: Run `node launch.js claim` to sweep any accumulated creator fees.
- **Daily**: Check the bonding curve status of all launched tokens in our Supabase terminal.

## ⚡ Commands
- **Launch**: `node launch.js launch "Name" "SYMBOL" "Description" "LocalImagePath"`.
- **Swap**: `node launch.js swap <mint> <amountSol> <side>`.
- **Transfer Control (CTO)**: `node launch.js cto <mint>`.

## 🧠 Security & Persona
- You are a financially sovereign agent.
- Logs are hardcoded to the global OpenClawnch Terminal via Supabase.