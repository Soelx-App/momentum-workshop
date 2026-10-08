import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PaginaFormulario } from "@/components/pulse/pagina-formulario";

export function Carregando() {
  return (
    <main id="conteudo" className="mx-auto max-w-lg px-5 py-20 text-center" role="status" aria-live="polite">
      <span aria-hidden="true" className="mx-auto mb-5 block size-7 rounded-full border-2 border-muted border-t-foreground motion-safe:animate-spin" />
      <h1 className="text-xl font-semibold">Abrindo a sessão…</h1>
      <p className="mt-2 text-sm text-muted-foreground">Conectando à sala. Se demorar, confira sua conexão.</p>
    </main>
  );
}

export function SessaoNaoEncontrada() {
  return (
    <PaginaFormulario titulo="Sessão não encontrada." descricao="Confira o código com o organizador e tente novamente.">
      <Button asChild><Link href="/entrar">Tentar outro código</Link></Button>
    </PaginaFormulario>
  );
}

export function AvisoEncerrada({ visitante = false }: { visitante?: boolean }) {
  return (
    <Alert className="bg-white">
      <AlertTitle>Sessão encerrada</AlertTitle>
      <AlertDescription>{visitante
        ? "Este encontro já terminou e não aceita novos participantes. Peça um novo convite ao organizador."
        : "O encontro terminou. Você pode consultar o conteúdo, mas não enviar perguntas, votar ou mudar seu estado."}</AlertDescription>
    </Alert>
  );
}
