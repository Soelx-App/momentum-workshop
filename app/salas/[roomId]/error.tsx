"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="room-main"><section className="card">
    <h1>Não foi possível carregar a sala</h1><p>Confira sua conexão e tente novamente.</p>
    <button className="button primary" onClick={reset}>Tentar novamente</button>
    <p><Link className="text-link" href="/">Voltar ao início →</Link></p>
  </section></main>;
}
