"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CODIGO_ALFABETO, CODIGO_TAMANHO, normalizarCodigo } from "@/convex/regras";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormEntrar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const codigoNormalizado = normalizarCodigo(codigo);
  const valido = codigoNormalizado.length === CODIGO_TAMANHO &&
    [...codigoNormalizado].every((caractere) => CODIGO_ALFABETO.includes(caractere));

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido) return;
    // A sala recupera a identidade salva antes de pedir o nome ou criar uma participação.
    router.push(`/s/${codigoNormalizado}`);
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={enviar} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="codigo">Código da sessão</Label>
            <Input id="codigo" value={codigo} maxLength={CODIGO_TAMANHO + 4}
              onChange={(e) => setCodigo(e.target.value)}
              className="h-14 font-mono text-xl uppercase tracking-[0.25em] md:text-xl"
              placeholder="ABC234" autoComplete="off" autoCapitalize="characters" spellCheck={false}
              aria-describedby="codigo-ajuda" required />
            <p id="codigo-ajuda" className="text-sm leading-relaxed text-muted-foreground">São 6 letras ou números. Se você já entrou neste navegador, retomamos sua participação.</p>
          </div>
          <Button type="submit" className="w-full" disabled={!valido}>Continuar <span aria-hidden="true">→</span></Button>
        </form>
      </CardContent>
    </Card>
  );
}
