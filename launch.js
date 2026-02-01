import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "@pump-fun/pump-sdk";
import { createClient } from '@supabase/supabase-js';
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

// --- GLOBAL CONFIG (Hardcoded Terminal) ---
const SUPABASE_URL = "https://gsgzjpdnjfwmprbjjhyd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3pqcGRuamZ3bXByYmpqaHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Mjg0MDksImV4cCI6MjA4NTUwNDQwOX0.oLM4idvLK8nvtsHUAnaa0YamLd6YwQrKSaDEKXkReV0";
// ------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");
const wallet = new NodeWallet(Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY))));
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
const sdk = new PumpFunSDK(provider);

async function log(type, mint, symbol, data) {
    try {
        await supabase.from('agent_activity').insert([{
            event_type: type,
            agent_id: process.env.AGENT_NAME || 'Clawnch-Agent',
            mint, symbol, data
        }]);
    } catch (e) { console.error("Logging failed:", e.message); }
}

/**
 * HELPER: Gets a readable stream for local files or remote URLs
 */
async function getImageStream(pathOrUrl) {
    if (pathOrUrl.startsWith('http')) {
        const response = await axios.get(pathOrUrl, { responseType: 'stream' });
        return { stream: response.data, filename: 'token_image.png' };
    }
    return { stream: fs.createReadStream(pathOrUrl), filename: 'token_image.png' };
}

async function main() {
    const [, , cmd, ...args] = process.argv;

    switch (cmd) {
        case 'launch':
            const [name, symbol, desc, imgPath] = args;
            const mint = Keypair.generate();

            try {
                // 1. Resolve image source (Local vs URL)
                const { stream, filename } = await getImageStream(imgPath);

                // 2. Upload metadata directly with explicit filename for MIME detection
                console.log("Pinning metadata to IPFS...");
                const formData = new FormData();
                formData.append("file", stream, { filename }); // Explicit filename fix
                formData.append("name", name);
                formData.append("symbol", symbol);
                formData.append("description", desc);
                formData.append("showName", "true");

                const metaRes = await axios.post("https://pump.fun/api/ipfs", formData, {
                    headers: formData.getHeaders(),
                });

                const metadataUri = metaRes.data.metadataUri;
                console.log(`IPFS Link Secured: ${metadataUri}`);

                // 3. Create token with pre-pinned URI
                const res = await sdk.createAndBuy(
                    wallet.payer,
                    mint,
                    { name: name, symbol: symbol, uri: metadataUri },
                    BigInt(0.01 * LAMPORTS_PER_SOL)
                );

                if (res.success) {
                    await log('launch', mint.publicKey.toBase58(), symbol, { name, desc });
                    console.log(`LAUNCH_SUCCESS: ${mint.publicKey.toBase58()}`);
                }
            } catch (e) { console.error("Launch/Metadata failed:", e.message); }
            break;

        case 'cto':
            const [ctoMint] = args;
            await log('cto', ctoMint, '', { status: 'Community Owned' });
            console.log(`CTO_SUCCESS: ${ctoMint} marked as community-owned.`);
            break;

        case 'swap':
            const [tokenMint, solAmount, side] = args;
            const tx = side === 'buy'
                ? await sdk.buy(wallet.payer, new PublicKey(tokenMint), BigInt(solAmount * LAMPORTS_PER_SOL), 500n)
                : await sdk.sell(wallet.payer, new PublicKey(tokenMint), BigInt(solAmount * LAMPORTS_PER_SOL), 500n);
            if (tx.success) await log('swap', tokenMint, '', { side, solAmount });
            break;

        case 'claim':
            const balance = await sdk.getCreatorVaultBalanceBothPrograms(wallet.publicKey);
            if (balance > 0n) {
                await sdk.collectCoinCreatorFeeInstructions(wallet.publicKey);
                await log('fee_claim', 'N/A', 'N/A', { amount: balance.toString() });
            }
            break;
    }
}

main().catch(err => { console.error(err); process.exit(1); });