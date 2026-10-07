import { FormCriarSessao } from "@/components/pulse/form-criar-sessao";
import { FormEntrar } from "@/components/pulse/form-entrar";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Pulse</h1>
        <p className="text-muted-foreground">
          Perguntas, votos e o clima da sala, ao vivo.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <FormCriarSessao />
        <FormEntrar />
      </div>
    </main>
  );
}
