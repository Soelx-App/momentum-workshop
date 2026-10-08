import Link from "next/link";

export function CabecalhoApp() {
  return (
    <header className="border-b border-border/80 bg-white">
      <nav aria-label="Navegação principal" className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Pulse — início" className="flex min-h-11 items-center gap-2.5 rounded-md text-xl font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-white">
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Pulse<span aria-hidden="true" className="text-muted-foreground">.</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <span className="hidden text-muted-foreground sm:block">Uma sala. Todas as vozes.</span>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md font-medium text-muted-foreground hover:text-foreground">Início</Link>
        </div>
      </nav>
    </header>
  );
}
