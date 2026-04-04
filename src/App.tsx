import { useEffect, useMemo, useState } from "react";
import {
  useSendTransaction,
  useWaitForSignature,
  useWalletConnection,
} from "@solana/react-hooks";
import STLViewerComponent from "./components/STLViewerComponent";
import ErrorBoundary from "./components/ErrorBoundary";
import { NFT_MINT_CONFIG } from "./config/nftMint";
import { formatNftMintError } from "./lib/nftMintError";
import { buildNftMintPlan, type NftMintPlan } from "./lib/nftMint";

type BackendVersion = {
  project: string;
  version: string;
};

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
const modelUrl = `${import.meta.env.BASE_URL}models/winder.stl`;
const homePath = import.meta.env.BASE_URL;
const howItWorksPath = `${import.meta.env.BASE_URL}how-it-works`;
const modelParametersPath = `${import.meta.env.BASE_URL}model-parameters`;

function getCurrentPath() {
  return window.location.pathname;
}

export default function App() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const {
    send,
    isSending: isMintSubmitting,
    signature: mintSignature,
    error: mintSubmitError,
    reset: resetMintSubmission,
  } = useSendTransaction();
  const [backendVersion, setBackendVersion] = useState<BackendVersion | null>(
    null
  );
  const [versionError, setVersionError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [isPreparingMint, setIsPreparingMint] = useState(false);
  const [mintResult, setMintResult] = useState<NftMintPlan | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const address = wallet?.account.address.toString();
  const mintConfirmation = useWaitForSignature(mintSignature ?? undefined, {
    commitment: "confirmed",
  });
  const isMintPending =
    isPreparingMint ||
    isMintSubmitting ||
    mintConfirmation.waitStatus === "waiting";
  const isMintSuccess = mintConfirmation.waitStatus === "success";
  const activeMintError =
    mintError ??
    (mintSubmitError instanceof Error
      ? mintSubmitError.message
      : mintSubmitError
        ? String(mintSubmitError)
        : mintConfirmation.waitStatus === "error"
          ? "Mint confirmation failed on devnet."
          : null);

  const mintStatusMessage = useMemo(() => {
    if (!wallet) {
      return "Connect a wallet to enable minting from this page.";
    }

    if (isPreparingMint) {
      return "Preparing NFT mint instructions...";
    }

    if (isMintSubmitting) {
      return "Wallet approval received. Submitting the mint transaction...";
    }

    if (mintConfirmation.waitStatus === "waiting") {
      return "Mint transaction submitted. Waiting for devnet confirmation...";
    }

    if (isMintSuccess && mintResult) {
      return `NFT minted successfully. Mint address: ${mintResult.mintAddress}`;
    }

    if (activeMintError) {
      return activeMintError;
    }

    return "Ready to mint a new NFT using the hosted metadata configuration.";
  }, [
    wallet,
    isPreparingMint,
    isMintSubmitting,
    mintConfirmation.waitStatus,
    isMintSuccess,
    mintResult,
    activeMintError,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendVersion() {
      try {
        const response = await fetch(`${backendBaseUrl}/api/version`);

        if (!response.ok) {
          throw new Error(`Backend request failed with ${response.status}`);
        }

        const payload = (await response.json()) as BackendVersion;

        if (!cancelled) {
          setBackendVersion(payload);
          setVersionError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setVersionError(
            error instanceof Error
              ? error.message
              : "Failed to load backend version"
          );
        }
      }
    }

    void loadBackendVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleLocationChange() {
      setCurrentPath(getCurrentPath());
    }

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  }

  async function handleMint() {
    if (!wallet) {
      setMintError("Connect a wallet before minting.");
      return;
    }

    setIsPreparingMint(true);
    setMintError(null);
    setMintResult(null);
    resetMintSubmission();

    try {
      const plan = await buildNftMintPlan(wallet);
      setMintResult(plan);
      await send({
        instructions: plan.instructions,
        prepareTransaction: false,
      });
    } catch (error) {
      console.error("NFT mint failed", error);
      setMintError(formatNftMintError(error));
    } finally {
      setIsPreparingMint(false);
    }
  }

  const isHowItWorksPage =
    currentPath === howItWorksPath ||
    currentPath === `${howItWorksPath}/` ||
    currentPath.endsWith("/how-it-works");

  const isModelParametersPage =
    currentPath === modelParametersPath ||
    currentPath === `${modelParametersPath}/` ||
    currentPath.endsWith("/model-parameters");

  const footer = (
    <footer className="mt-auto border-t border-border-low pt-6 text-sm text-muted">
      <p>
        Backend status:{" "}
        {backendVersion
          ? `${backendVersion.project} v${backendVersion.version}`
          : versionError
            ? `Unavailable (${versionError})`
            : "Loading..."}
      </p>
    </footer>
  );

  if (isModelParametersPage) {
    return (
      <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
        <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
          <header className="space-y-4">
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted underline underline-offset-4 transition hover:text-foreground"
            >
              Back to main page
            </button>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">
                Model Parameters
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Cable Winder — editable parameters (mock)
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted">
                This is a draft page for configuring model dimensions before minting.
              </p>
            </div>
          </header>

          <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
            <div className="space-y-1">
              <p className="text-lg font-semibold">3D preview</p>
              <p className="text-sm text-muted">
                Live model preview area (prototype).
              </p>
            </div>
            <ErrorBoundary>
              <STLViewerComponent url={modelUrl} />
            </ErrorBoundary>
          </section>

          <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Parameters</p>
              <p className="text-sm text-muted">
                Initial mockup fields. Final list and logic to be уточнены later.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted">Height (mm)</span>
                <input type="number" value={16} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">Width (mm)</span>
                <input type="number" value={60} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">Length (mm)</span>
                <input type="number" value={60} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">Radius (mm)</span>
                <input type="number" value={16.5} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">Inner diameter (mm)</span>
                <input type="number" value={29} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">Wire diameter (mm)</span>
                <input type="number" value={3} readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-muted">Material</span>
                <input type="text" value="PLA" readOnly className="w-full rounded-lg border border-border-low bg-bg1 px-3 py-2" />
              </label>
            </div>

            <div className="space-y-4 border-t border-border-low pt-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Mint NFT</p>
                <p className="text-sm text-muted">
                  Mint this prototype as a devnet NFT using the existing wallet
                  connection and hosted metadata.
                </p>
              </div>

              <div className="grid gap-2 rounded-xl border border-border-low bg-bg1 p-4 text-sm text-muted">
                <p>
                  Metadata JSON:{" "}
                  <span className="font-mono text-xs text-foreground">
                    {NFT_MINT_CONFIG.metadataUri}
                  </span>
                </p>
                <p>
                  Stub image:{" "}
                  <span className="font-mono text-xs text-foreground">
                    {NFT_MINT_CONFIG.imageUri}
                  </span>
                </p>
                {mintSignature ? (
                  <p>
                    Transaction signature:{" "}
                    <span className="font-mono text-xs text-foreground">
                      {mintSignature.toString()}
                    </span>
                  </p>
                ) : null}
                {mintResult ? (
                  <p>
                    Planned mint address:{" "}
                    <span className="font-mono text-xs text-foreground">
                      {mintResult.mintAddress}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleMint()}
                  disabled={!wallet || isMintPending}
                  className="inline-flex cursor-pointer items-center rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMintPending ? "Minting..." : "Mint NFT"}
                </button>
                <span
                  className={`text-sm ${
                    activeMintError
                      ? "text-red-600"
                      : isMintSuccess
                        ? "text-green-700"
                        : "text-muted"
                  }`}
                  role={activeMintError ? "alert" : undefined}
                >
                  {mintStatusMessage}
                </span>
              </div>
            </div>
          </section>

          {footer}
        </main>
      </div>
    );
  }

  if (isHowItWorksPage) {
    return (
      <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
        <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
          <header className="space-y-4">
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted underline underline-offset-4 transition hover:text-foreground"
            >
              Back to main page
            </button>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">
                How It Works
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Paramint: create and own your 3D models
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted">
                We are building a platform where 3D model generation becomes an
                open-source process. Recipes are published on GitHub, where they
                can be forked and improved through pull requests.
              </p>
              <p className="max-w-2xl text-base leading-relaxed text-muted">
                When a user generates a model and mints an NFT, rewards are
                automatically distributed between recipe authors and the
                platform. This turns open-source contribution into a sustainable
                economy.
              </p>
            </div>
          </header>

          <section className="w-full max-w-3xl space-y-6 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                How it works
              </h2>
              <ol className="space-y-4 text-sm leading-relaxed text-muted">
                <li>
                  <span className="font-medium text-foreground">
                    1. Choose a template
                  </span>
                  {" "}
                  Start with a ready-made model, for example a cable holder.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    2. Adjust the parameters
                  </span>
                  {" "}
                  Change the size and shape and see the result immediately.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    3. Connect your wallet and create the model
                  </span>
                  {" "}
                  Create an on-chain asset that ties this configuration to you.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    4. Get full control
                  </span>
                  {" "}
                  Only the owner can change parameters, rebuild the model, and
                  export files for printing.
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                Openness and ownership
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                All models are stored as open artifacts, but only the owner
                controls their recipe.
              </p>
              <p className="text-sm leading-relaxed text-muted">
                You are not just downloading an STL, you own the ability to
                recreate the object.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                Why it matters
              </h2>
              <ul className="space-y-2 text-sm leading-relaxed text-muted">
                <li>Parametric design instead of static files.</li>
                <li>Control through ownership, not restrictions.</li>
                <li>The ability to improve and adapt the model over time.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                Try it
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Create your first model in just a few clicks and become its
                owner.
              </p>
              <button
                type="button"
                onClick={() => navigate(homePath)}
                className="inline-flex cursor-pointer items-center rounded-lg border border-border-low bg-cream px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Start Designing
              </button>
            </div>
          </section>

          {footer}
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            3DMint - making 3D NFTs on Solana
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Become a 3d creator, not a consumer
          </h1>
          <div className="space-y-3">
            <p className="max-w-3xl text-base leading-relaxed text-muted">
              Customize your 3d models for your needs, then mint them as NFTs to
              own, sell, or share.
            </p>
          </div>
          <ol className="mt-4 space-y-2 text-sm text-foreground">
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>1. customize the 3D model for your needs</div>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>2. mint an NFT for your model.</div>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>
                3. download the NFT for 3D printing, AR, or whatever you can
                imagine.
              </div>
            </li>
          </ol>
          <button
            type="button"
            onClick={() => navigate(howItWorksPath)}
            className="inline-flex cursor-pointer text-sm font-medium text-foreground underline underline-offset-4 transition hover:text-muted"
          >
            Read more
          </button>
        </header>

        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          <div className="space-y-1">
            <p className="text-lg font-semibold">3D preview: cable winder</p>
            <p className="text-sm text-muted">
              STL model imported from the 3d_models project.
            </p>
          </div>
          <ErrorBoundary>
            <STLViewerComponent url={modelUrl} />
          </ErrorBoundary>
          <button
            type="button"
            onClick={() => navigate(modelParametersPath)}
            className="inline-flex cursor-pointer text-sm font-medium text-foreground underline underline-offset-4 transition hover:text-muted"
          >
            Model parameters
          </button>
        </section>

        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Wallet connection</p>
              <p className="text-sm text-muted">
                Pick any discovered connector and manage connect / disconnect in
                one spot.
              </p>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="group flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col">
                  <span className="text-base">{connector.name}</span>
                  <span className="text-xs text-muted">
                    {status === "connecting"
                      ? "Connecting…"
                      : status === "connected" &&
                          wallet?.connector.id === connector.id
                        ? "Active"
                        : "Tap to connect"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border-low pt-4 text-sm">
            <span className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs">
              {address ?? "No wallet connected"}
            </span>
            <button
              onClick={() => disconnect()}
              disabled={status !== "connected"}
              className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </section>

        {footer}
      </main>
    </div>
  );
}
