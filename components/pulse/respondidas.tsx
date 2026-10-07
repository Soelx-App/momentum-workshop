import type { PerguntaRespondida } from "@/lib/tipos";

export function Respondidas({ perguntas }: { perguntas: PerguntaRespondida[] }) {
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer font-medium">Respondidas ({perguntas.length})</summary>
      {perguntas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma pergunta respondida.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {perguntas.map((p) => (
            <li key={p.id} className="rounded-md bg-muted p-3">
              <p className="break-words">{p.texto}</p>
              <p className="text-xs text-muted-foreground">
                {p.autorNome} · {p.votos} votos
              </p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
