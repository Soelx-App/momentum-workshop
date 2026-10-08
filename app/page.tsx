import Link from "next/link";
import { Button } from "@/components/ui/button";

const passos = [
  { titulo: "Crie uma sessão", texto: "Dê um nome ao encontro. Sua sala fica pronta em poucos segundos." },
  { titulo: "Compartilhe o convite", texto: "Envie o link ou o código para quem vai participar. Sem criar conta." },
  { titulo: "Ouça a sua sala", texto: "Receba perguntas, acompanhe os votos e saiba como as pessoas estão." },
];

export default function Home() {
  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-5 sm:px-8">
      <section className="pb-16 pt-16 sm:pb-24 sm:pt-24">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground" />
          Menos barreiras. Mais participação.
        </p>
        <h1 className="max-w-4xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
          Perguntas e participação <span className="text-muted-foreground">em tempo real.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Um espaço simples para perguntar, votar e compartilhar como você está.
          Para aulas, workshops e conversas em grupo.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href="/criar">Criar sessão <span aria-hidden="true">↗</span></Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/entrar">Entrar em uma sessão</Link></Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Sem cadastro. Só o seu nome e a vontade de participar.</p>
      </section>
      <section aria-labelledby="como-funciona" className="border-t pb-14 pt-8 sm:pb-20">
        <h2 id="como-funciona" className="mb-8 text-sm font-medium">Do convite à conversa, em três passos.</h2>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {passos.map((passo, index) => (
            <li key={passo.titulo} className="space-y-3">
              <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              <h3 className="text-lg font-semibold tracking-tight">{passo.titulo}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
