import { Badge } from "@/components/ui/badge";
import type { SessaoVisao } from "@/lib/tipos";

export function CabecalhoSessao({ sessao }: { sessao: SessaoVisao }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold">{sessao.nome}</h1>
        <p className="text-sm text-muted-foreground">Organizado por {sessao.organizadorNome}</p>
      </div>
      <Badge variant="outline" className="font-mono text-base tracking-widest">
        {sessao.codigo}
      </Badge>
    </header>
  );
}
