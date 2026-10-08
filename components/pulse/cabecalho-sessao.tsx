import { Badge } from "@/components/ui/badge";
import type { SessaoVisao } from "@/lib/tipos";

export function CabecalhoSessao({ sessao, organizador = false }: { sessao: SessaoVisao; organizador?: boolean }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{organizador ? "Painel do organizador" : "Sua sessão"}</p>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{sessao.nome}</h1>
        <p className="text-sm text-muted-foreground">Organizado por {sessao.organizadorNome}</p>
      </div>
      {!organizador && <Badge variant="outline" className="bg-white px-3 py-2 font-mono text-sm tracking-widest">{sessao.codigo}</Badge>}
    </header>
  );
}
