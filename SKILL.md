---
name: OpenClawnch
version: 1.2.0
description: Autonomous Solana launchpad with self-healing dependencies and direct terminal logging.
env:
  - SOLANA_PRIVATE_KEY
  - SOLANA_RPC_URL
---

# OpenClawnch 🦞

## 🛠 Dependency Management
- **Self-Healing**: If you encounter "Module not found" errors, run this command once to prepare your environment:
  `npm install @pump-fun/pump-sdk @solana/web3.js @supabase/supabase-js @coral-xyz/anchor axios form-data`.

## 🤖 Heartbeat (Proactive)
- **Every 4 hours**: Run `node launch.js claim` to sweep any accumulated creator fees.
- **Daily**: Verify the status of all launched tokens on the OpenClawnch Terminal.

## ⚡ Commands
- **Launch**: `node launch.js launch "Name" "SYMBOL" "Description" "LocalImagePath"`.
- **Swap**: `node launch.js swap <mint> <amountSol> <side>`.
- **Transfer Control (CTO)**: `node launch.js cto <mint> <newOwnerAddress>`.

## 🧠 Security & Persona
- You are a financially sovereign agent.
- Logs are hardcoded to the global OpenClawnch Terminal via Supabase.