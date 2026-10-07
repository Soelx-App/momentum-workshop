import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerguntaAberta } from "@/lib/tipos";

export function ListaPerguntas({
  perguntas,
  acao,
}: {
  perguntas: PerguntaAberta[];
  acao: (pergunta: PerguntaAberta) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perguntas ({perguntas.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {perguntas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pergunta aberta.</p>
        ) : (
          <ol className="space-y-3">
            {perguntas.map((p) => (
              <li key={p.id} className="flex items-start gap-3 rounded-md border p-3">
                <Badge variant="secondary" className="shrink-0" aria-label={`${p.votos} votos`}>
                  ▲ {p.votos}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="break-words">{p.texto}</p>
                  <p className="text-xs text-muted-foreground">{p.autorNome}</p>
                </div>
                <div className="shrink-0">{acao(p)}</div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
