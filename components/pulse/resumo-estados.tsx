import { Badge } from "@/components/ui/badge";
import { ESTADOS, estadoEfetivo } from "@/convex/estados";
import type { ParticipanteVisao } from "@/lib/tipos";

export function ResumoEstados({
  participantes,
  referencia,
}: {
  participantes: ParticipanteVisao[];
  referencia: number;
}) {
  const contagem = new Map<string, number>();
  for (const p of participantes) {
    const estado = estadoEfetivo(p, referencia);
    contagem.set(estado, (contagem.get(estado) ?? 0) + 1);
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Resumo dos estados">
      {ESTADOS.map((e) => (
        <Badge key={e.valor} variant={contagem.get(e.valor) ? "default" : "outline"}>
          {e.emoji} {e.rotulo}: {contagem.get(e.valor) ?? 0}
        </Badge>
      ))}
    </div>
  );
}
