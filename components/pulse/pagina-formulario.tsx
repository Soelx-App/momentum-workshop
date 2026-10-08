import type { ReactNode } from "react";

export function PaginaFormulario({ titulo, descricao, children, rodape }: {
  titulo: string;
  descricao: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-lg px-5 py-12 sm:py-20">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="leading-relaxed text-muted-foreground">{descricao}</p>
      </header>
      {children}
      {rodape && <div className="mt-6 text-center text-sm text-muted-foreground">{rodape}</div>}
    </main>
  );
}
