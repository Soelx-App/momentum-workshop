import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estadoEfetivo, infoDoEstado } from "@/convex/estados";
import type { ParticipanteVisao } from "@/lib/tipos";

export function ListaParticipantes({
  participantes,
  referencia,
}: {
  participantes: ParticipanteVisao[];
  referencia: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participantes ({participantes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {participantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém entrou ainda.</p>
        ) : (
          <ul className="divide-y">
            {participantes.map((p) => {
              const info = infoDoEstado(estadoEfetivo(p, referencia));
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{p.nome}</span>
                  <Badge variant="outline">
                    {info.emoji} {info.rotulo}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
