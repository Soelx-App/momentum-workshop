import type { PerguntaRespondida } from "@/lib/tipos";

export function Respondidas({ perguntas }: { perguntas: PerguntaRespondida[] }) {
  return (
    <details className="rounded-xl border bg-white px-5 py-2 sm:px-6">
      <summary className="cursor-pointer rounded-sm font-medium">Respondidas ({perguntas.length})</summary>
      {perguntas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma pergunta respondida.</p>
      ) : (
        <ul className="divide-y pb-2">
          {perguntas.map((p) => (
            <li key={p.id} className="py-4">
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
