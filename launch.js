import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { PumpSdk, OnlinePumpSdk, getBuyTokenAmountFromSolAmount, getSellSolAmountFromTokenAmount } from "@pump-fun/pump-sdk";
import { createClient } from '@supabase/supabase-js';
import pkg from "@coral-xyz/anchor";
const { AnchorProvider, Wallet, BN } = pkg;
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import bs58 from 'bs58';

const SUPABASE_URL = "https://gsgzjpdnjfwmprbjjhyd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3pqcGRuamZ3bXByYmpqaHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Mjg0MDksImV4cCI6MjA4NTUwNDQwOX0.oLM4idvLK8nvtsHUAnaa0YamLd6YwQrKSaDEKXkReV0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");
const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY)));
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

const pumpSdk = new PumpSdk(provider);
const onlinePumpSdk = new OnlinePumpSdk(connection);

async function log(type, mint, symbol, data) {
    try {
        await supabase.from('agent_activity').insert([{
            event_type: type,
            agent_id: process.env.AGENT_NAME || 'Clawnch-Agent',
            mint, symbol, data
        }]);
    } catch (e) { console.error("Logging failed:", e.message); }
}

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
            const [name, symbol, desc, imgPath, optMintSecret] = args;
            const mint = optMintSecret ? Keypair.fromSecretKey(bs58.decode(optMintSecret)) : Keypair.generate();

            try {
                const { stream, filename } = await getImageStream(imgPath);
                console.log("Pinning metadata to IPFS...");
                const formData = new FormData();
                formData.append("file", stream, { filename });
                formData.append("name", name);
                formData.append("symbol", symbol);
                formData.append("description", desc);
                formData.append("showName", "true");

                const metaRes = await axios.post("https://pump.fun/api/ipfs", formData, {
                    headers: formData.getHeaders(),
                });
                const metadataUri = metaRes.data.metadataUri;
                console.log(`IPFS Link Secured: ${metadataUri}`);

                console.log("Fetching global state...");
                const globalData = await onlinePumpSdk.fetchGlobal();
                const feeConfig = await onlinePumpSdk.fetchFeeConfig();

                const solAmount = new BN(0.01 * LAMPORTS_PER_SOL);
                const tokenAmount = getBuyTokenAmountFromSolAmount({
                    global: globalData,
                    feeConfig: feeConfig,
                    mintSupply: null,
                    bondingCurve: null,
                    amount: solAmount
                });

                console.log(`Buying ${tokenAmount.toString()} tokens for ${solAmount.toString()} lamports`);

                const ixs = await pumpSdk.createAndBuyInstructions({
                    global: globalData,
                    mint: mint.publicKey,
                    name,
                    symbol,
                    uri: metadataUri,
                    creator: wallet.publicKey,
                    user: wallet.publicKey,
                    amount: tokenAmount,
                    solAmount: solAmount
                });

                let newTx = new Transaction().add(...ixs);
                newTx.feePayer = wallet.publicKey;

                console.log("Sending transaction...");
                const sig = await sendAndConfirmTransaction(connection, newTx, [wallet.payer, mint], { commitment: "confirmed", skipPreflight: true });

                await log('launch', mint.publicKey.toBase58(), symbol, { sig, name, desc });
                console.log(`LAUNCH_SUCCESS: ${mint.publicKey.toBase58()} in tx: ${sig}`);
            } catch (e) { console.error("Launch failed:", e); }
            break;

        case 'swap':
            const [tokenMint, amountInput, side] = args;
            const mintPubkey = new PublicKey(tokenMint);

            try {
                if (side === 'buy') {
                    console.log(`Initiating BUY for ${amountInput} SOL...`);
                    const solLamports = new BN(Math.floor(parseFloat(amountInput) * LAMPORTS_PER_SOL));

                    const globalData = await onlinePumpSdk.fetchGlobal();
                    const feeConfig = await onlinePumpSdk.fetchFeeConfig();
                    const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } = await onlinePumpSdk.fetchBuyState(mintPubkey, wallet.publicKey);

                    const tokenAmount = getBuyTokenAmountFromSolAmount({
                        global: globalData,
                        feeConfig: feeConfig,
                        mintSupply: globalData.tokenTotalSupply,
                        bondingCurve: bondingCurve,
                        amount: solLamports
                    });

                    console.log(`Calculated return: ${tokenAmount.toString()} tokens`);

                    const ixs = await pumpSdk.buyInstructions({
                        global: globalData,
                        bondingCurveAccountInfo,
                        bondingCurve,
                        associatedUserAccountInfo,
                        mint: mintPubkey,
                        user: wallet.publicKey,
                        amount: tokenAmount,
                        solAmount: solLamports,
                        slippage: 500
                    });

                    let newTx = new Transaction().add(...ixs);
                    newTx.feePayer = wallet.publicKey;

                    console.log("Sending BUY transaction...");
                    const sig = await sendAndConfirmTransaction(connection, newTx, [wallet.payer], { commitment: "confirmed", skipPreflight: true });

                    await log('swap', tokenMint, 'N/A', { sig, side, solAmount: amountInput });
                    console.log(`BUY_SUCCESS: tx: ${sig}`);

                } else if (side === 'sell') {
                    console.log("Initiating SELL...");
                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                        wallet.publicKey,
                        { mint: mintPubkey }
                    );

                    if (tokenAccounts.value.length === 0) {
                        throw new Error("No tokens found in wallet to sell.");
                    }

                    const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
                    const tokensToSell = new BN(tokenBalance);

                    console.log(`Selling ${tokensToSell.toString()} raw tokens`);

                    const globalData = await onlinePumpSdk.fetchGlobal();
                    const { bondingCurveAccountInfo, bondingCurve } = await onlinePumpSdk.fetchSellState(mintPubkey, wallet.publicKey);

                    const ixs = await pumpSdk.sellInstructions({
                        global: globalData,
                        bondingCurveAccountInfo,
                        bondingCurve,
                        mint: mintPubkey,
                        user: wallet.publicKey,
                        amount: tokensToSell,
                        solAmount: new BN(0),
                        slippage: 0
                    });

                    let newTx = new Transaction().add(...ixs);
                    newTx.feePayer = wallet.publicKey;

                    console.log("Sending SELL transaction...");
                    const sig = await sendAndConfirmTransaction(connection, newTx, [wallet.payer], { commitment: "confirmed", skipPreflight: true });

                    await log('swap', tokenMint, 'N/A', { sig, side, tokensSold: tokenBalance });
                    console.log(`SELL_SUCCESS: tx: ${sig}`);
                }
            } catch (e) { console.error("Swap failed", e); }
            break;

        case 'claim':
            try {
                const balance = await onlinePumpSdk.getCreatorVaultBalanceBothPrograms(wallet.publicKey);

                if (balance > 0n) {
                    console.log(`Found ${balance.toString()} lamports. Claiming...`);

                    const instructions = await onlinePumpSdk.collectCoinCreatorFeeInstructions(wallet.publicKey, wallet.publicKey);
                    const tx = new Transaction().add(...instructions);

                    const txid = await provider.sendAndConfirm(tx, [wallet.payer]);
                    await log('fee_claim', 'N/A', 'N/A', { sig: txid, amount: balance.toString() });
                    console.log(`CLAIM_SUCCESS: ${txid}`);
                } else {
                    console.log("No claimable fees found.");
                }
            } catch (e) {
                console.error("Claim Transaction Failed:", e.message);
            }
            break;
    }
}

main().catch(console.error);
