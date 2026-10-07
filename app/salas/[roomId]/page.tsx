import { PublicRoom } from "./room-view";

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <PublicRoom roomId={roomId} />;
}
