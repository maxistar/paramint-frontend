import { createWalletTransactionSigner, type WalletSession } from "@solana/client";
import { createNft } from "@metaplex-foundation/mpl-token-metadata-kit";
import { generateKeyPairSigner } from "@solana/signers";
import { NFT_MINT_CONFIG } from "../config/nftMint";

export type NftMintPlan = {
  imageUri: string;
  instructions: Awaited<ReturnType<typeof createNft>>;
  metadataUri: string;
  mintAddress: string;
};

export async function buildNftMintPlan(
  session: WalletSession
): Promise<NftMintPlan> {
  const { signer: walletSigner } = createWalletTransactionSigner(session);
  const mint = await generateKeyPairSigner();
  const instructions = await createNft({
    mint,
    authority: walletSigner,
    payer: walletSigner,
    updateAuthority: walletSigner,
    tokenOwner: session.account.address,
    name: NFT_MINT_CONFIG.name,
    symbol: NFT_MINT_CONFIG.symbol,
    uri: NFT_MINT_CONFIG.metadataUri,
    sellerFeeBasisPoints: NFT_MINT_CONFIG.sellerFeeBasisPoints,
  });

  return {
    imageUri: NFT_MINT_CONFIG.imageUri,
    instructions,
    metadataUri: NFT_MINT_CONFIG.metadataUri,
    mintAddress: mint.address.toString(),
  };
}

