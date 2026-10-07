"use client";

import { useSyncExternalStore } from "react";

function assinarRelogio(avisar: () => void) {
  const id = window.setInterval(avisar, 1000);
  return () => window.clearInterval(id);
}

/** Relógio arredondado ao segundo; o valor fica estável entre ticks. */
export function useAgora(): number {
  return useSyncExternalStore(
    assinarRelogio,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => 0,
  );
}
