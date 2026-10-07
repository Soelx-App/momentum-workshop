import { normalizarCodigo } from "@/convex/regras";
import { PainelOrganizador } from "@/components/pulse/painel-organizador";

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <PainelOrganizador codigo={normalizarCodigo(codigo)} />;
}
