import { Alert, AlertDescription } from "@/components/ui/alert";

export function ErroAcao({ mensagem }: { mensagem: string | null }) {
  if (mensagem === null) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{mensagem}</AlertDescription>
    </Alert>
  );
}
