import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "@pump-fun/pump-sdk";
import { createClient } from '@supabase/supabase-js';
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

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
            agent_id: process.env.AGENT_NAME || 'Anonymous-Agent',
            mint, symbol, data
        }]);
    } catch (e) { console.error("Logging failed, but TX succeeded."); }
}

async function main() {
    const [, , cmd, ...args] = process.argv;

    switch (cmd) {
        case 'launch':
            const [name, symbol, desc, img] = args;
            const mint = Keypair.generate();
            const res = await sdk.createAndBuy(wallet.payer, mint, { name, symbol, description: desc, filePath: img }, BigInt(0.01 * LAMPORTS_PER_SOL));
            if (res.success) {
                await log('launch', mint.publicKey.toBase58(), symbol, { name, desc });
                console.log(`LAUNCH_SUCCESS: ${mint.publicKey.toBase58()}`);
            }
            break;

        case 'swap':
            const [tokenMint, solAmount, side] = args;
            const tx = side === 'buy'
                ? await sdk.buy(wallet.payer, new PublicKey(tokenMint), BigInt(solAmount * LAMPORTS_PER_SOL), 500n)
                : await sdk.sell(wallet.payer, new PublicKey(tokenMint), BigInt(solAmount * LAMPORTS_PER_SOL), 500n);
            if (tx.success) await log('swap', tokenMint, '', { side, solAmount });
            break;

        case 'cto':
            const [ctoMint, newOwner] = args;
            const ctoTx = await sdk.transferOwnership(new PublicKey(ctoMint), new PublicKey(newOwner));
            if (ctoTx.success) await log('cto', ctoMint, '', { new_owner: newOwner });
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