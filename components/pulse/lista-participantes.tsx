import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estadoEfetivo, infoDoEstado } from "@/convex/estados";
import type { ParticipanteVisao } from "@/lib/tipos";

export function ListaParticipantes({ participantes, referencia, recolhivel = false }: {
  participantes: ParticipanteVisao[];
  referencia: number;
  recolhivel?: boolean;
}) {
  const conteudo = participantes.length === 0 ? (
    <p className="text-sm leading-relaxed text-muted-foreground">Ninguém entrou ainda. Compartilhe o convite para começar.</p>
  ) : (
    <ul className="divide-y">
      {participantes.map((p) => {
        const info = infoDoEstado(estadoEfetivo(p, referencia));
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="min-w-0 break-words text-sm">{p.nome}</span>
            <Badge variant="outline" className="shrink-0 font-normal">{info.emoji} {info.rotulo}</Badge>
          </li>
        );
      })}
    </ul>
  );
  if (recolhivel) return (
    <details className="rounded-xl border bg-white px-5 py-2 sm:px-6">
      <summary className="cursor-pointer rounded-sm font-medium">Participantes <span className="ml-1 text-muted-foreground">({participantes.length})</span></summary>
      <div className="pb-3 pt-2">{conteudo}</div>
    </details>
  );
  return (
    <Card>
      <CardHeader><CardTitle>Participantes <span className="font-normal text-muted-foreground">({participantes.length})</span></CardTitle></CardHeader>
      <CardContent>{conteudo}</CardContent>
    </Card>
  );
}
