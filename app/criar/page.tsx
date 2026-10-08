import Link from "next/link";
import { FormCriarSessao } from "@/components/pulse/form-criar-sessao";
import { PaginaFormulario } from "@/components/pulse/pagina-formulario";

export default function Criar() {
  return (
    <PaginaFormulario titulo="Crie a sua sessão." descricao="Prepare o encontro e convide as pessoas com um link ou código."
      rodape={<>Recebeu um convite? <Link className="text-foreground underline underline-offset-4" href="/entrar">Entre em uma sessão</Link></>}>
      <FormCriarSessao />
    </PaginaFormulario>
  );
}
