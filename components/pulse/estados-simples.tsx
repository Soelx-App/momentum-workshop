import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function Carregando() {
  return <p className="p-10 text-center text-muted-foreground">Conectando…</p>;
}

export function SessaoNaoEncontrada() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10 text-center">
      <h1 className="text-2xl font-bold">Sessão não encontrada</h1>
      <p className="text-muted-foreground">Confira o código com o organizador.</p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}

export function AvisoEncerrada() {
  return (
    <Alert>
      <AlertTitle>Sessão encerrada</AlertTitle>
      <AlertDescription>O conteúdo continua visível, mas não aceita novas ações.</AlertDescription>
    </Alert>
  );
}
