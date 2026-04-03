const publicBaseUrl = (
  import.meta.env.VITE_PUBLIC_BASE_URL ??
  (typeof window !== "undefined"
    ? window.location.origin
    : "https://dddmint.preloader.com")
).replace(/\/$/, "");

export const NFT_MINT_CONFIG = {
  imageUri:
    import.meta.env.VITE_NFT_IMAGE_URI ??
    `${publicBaseUrl}/images/mock-nft.png`,
  metadataUri:
    import.meta.env.VITE_NFT_METADATA_URI ??
    `${publicBaseUrl}/metadata/mock-nft.json`,
  name: import.meta.env.VITE_NFT_NAME ?? "Paramint Cable Winder",
  sellerFeeBasisPoints: Number(
    import.meta.env.VITE_NFT_SELLER_FEE_BASIS_POINTS ?? "0"
  ),
  symbol: import.meta.env.VITE_NFT_SYMBOL ?? "PMINT",
} as const;
