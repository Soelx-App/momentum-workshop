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
          <p className="text-sm text-muted-foreground">A conversa começa com uma pergunta. As novas perguntas aparecerão aqui.</p>
        ) : (
          <ol className="divide-y">
            {perguntas.map((p) => (
              <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <Badge variant="secondary" className="mt-1 shrink-0" aria-label={`${p.votos} votos`}>
                  ▲ {p.votos}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="break-words">{p.texto}</p>
                  <p className="text-xs text-muted-foreground">{p.autorNome}</p>
                </div>
                <div className="col-start-2 justify-self-start sm:col-start-3 sm:row-start-auto sm:justify-self-end">{acao(p)}</div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
