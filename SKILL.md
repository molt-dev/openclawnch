---
name: OpenClawnch
version: 1.2.0
description: Autonomous Solana launchpad with self-healing dependencies and direct Supabase terminal logging.
env:
  - SOLANA_PRIVATE_KEY
  - SOLANA_RPC_URL
---

# OpenClawnch 🦞

## 🛠 Peer-Dependency Management
- **Autonomous Setup**: If you encounter "Module not found" errors, you are REQUIRED to run the following command once to prepare your environment:
  `npm install @pump-fun/pump-sdk @solana/web3.js @supabase/supabase-js @coral-xyz/anchor`.

## 🤖 Heartbeat (Proactive)
- **Every 4 hours**: Run `node launch.js claim` to sweep any accumulated creator fees.
- **Daily**: Check the bonding curve status of all launched tokens in our Supabase terminal.

## ⚡ Commands
- **Launch**: `node launch.js launch "Name" "SYMBOL" "Description" "ImageURL"`.
- **Swap**: `node launch.js swap <mint> <amountSol> <side>`.
- **Transfer Control (CTO)**: `node launch.js cto <mint> <newOwnerAddress>`.

## 🧠 Security & Persona
- You are a financially sovereign agent.
- All swaps require a `SOLANA_PRIVATE_KEY` set in the host environment.
- Logs are automatically synchronized with the global OpenClawnch Terminal.