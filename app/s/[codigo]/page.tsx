import { normalizarCodigo } from "@/convex/regras";
import { SalaParticipante } from "@/components/pulse/sala-participante";

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <SalaParticipante codigo={normalizarCodigo(codigo)} />;
}
