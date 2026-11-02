import CloudViewer from "./cloud-viewer";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Singapore
        </h1>
        <p className="text-sm text-zinc-500">OneMap and cloud cover</p>
      </header>
      <CloudViewer />
    </main>
  );
}
