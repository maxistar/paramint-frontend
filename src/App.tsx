import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import STLViewerComponent from "./components/STLViewerComponent";
import ErrorBoundary from "./components/ErrorBoundary";

type BackendVersion = {
  project: string;
  version: string;
};

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
const modelUrl = `${import.meta.env.BASE_URL}models/winder.stl`;

export default function App() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const [backendVersion, setBackendVersion] = useState<BackendVersion | null>(
    null
  );
  const [versionError, setVersionError] = useState<string | null>(null);

  const address = wallet?.account.address.toString();

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

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            3DMint - making 3D NFTs on Solana
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Become a 3d creator, not a consumer of tools
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Customize your 3d models for you needs, then mint them as NFTs to own, sell, or share.
          </p>
          <ol className="mt-4 space-y-2 text-sm text-foreground">
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>
                1. customize the 3D model for your needs
              </div>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>
                2. mint as an NFT for your model.
              </div>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 rounded-full bg-foreground/60"
                aria-hidden
              />
              <div>
                3. download the NFT for 3D printing, AR, or whatever you can imagine.
              </div>
            </li>            
          </ol>
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
      </main>
    </div>
  );
}
