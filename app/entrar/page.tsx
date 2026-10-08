import Link from "next/link";
import { FormEntrar } from "@/components/pulse/form-entrar";
import { PaginaFormulario } from "@/components/pulse/pagina-formulario";

export default function Entrar() {
  return (
    <PaginaFormulario titulo="Entre na conversa." descricao="Digite o código que o organizador compartilhou com você."
      rodape={<>Vai organizar o encontro? <Link className="text-foreground underline underline-offset-4" href="/criar">Crie uma sessão</Link></>}>
      <FormEntrar />
    </PaginaFormulario>
  );
}
