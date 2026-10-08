"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { LIMITES, textoValido } from "@/convex/regras";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAcao } from "@/lib/use-acao";

export function FormularioPergunta({ token, desativado }: { token: string; desativado: boolean }) {
  const enviarPergunta = useMutation(api.perguntas.enviar);
  const { pendente, erro, executar } = useAcao();
  const [texto, setTexto] = useState("");
  const valido = textoValido(texto, LIMITES.pergunta) !== null;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido || pendente || desativado) return;
    const ok = await executar(() => enviarPergunta({ token, texto }));
    if (ok) setTexto("");
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-xl border bg-white p-5 sm:p-6">
      <Label htmlFor="pergunta">Sua pergunta</Label>
      <Textarea
        id="pergunta"
        value={texto}
        maxLength={LIMITES.pergunta}
        onChange={(e) => setTexto(e.target.value)}
        disabled={desativado || pendente}
        placeholder="O que você gostaria de perguntar?"
        aria-describedby="pergunta-limite"
        required
        rows={3}
      />
      <div className="flex items-center justify-between">
        <span id="pergunta-limite" className="text-xs text-muted-foreground">
          {texto.length}/{LIMITES.pergunta}
        </span>
        <Button type="submit" disabled={desativado || !valido || pendente}>
          {pendente ? "Enviando..." : "Enviar pergunta"}
        </Button>
      </div>
      <ErroAcao mensagem={erro} />
    </form>
  );
}
