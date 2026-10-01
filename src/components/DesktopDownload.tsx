"use client";

import { useSyncExternalStore } from "react";

/** GitHub-ийн "latest" холбоос — шинэ release гаргахад энд юу ч солих хэрэггүй. */
const DOWNLOAD_URL =
  "https://github.com/titanchinzo/military-map-trainer/releases/latest/download/MilitaryMapTrainer-Setup.exe";

const subscribe = () => () => {};

/** Windows desktop програм татах товч. Desktop апп дотроос нээсэн үед нуугдана
 * (`desktop/preload.cjs` нь `window.mmtDesktop`-ыг тавьдаг). */
export default function DesktopDownload() {
  const inDesktop = useSyncExternalStore(
    subscribe,
    () => "mmtDesktop" in window,
    () => false,
  );
  if (inDesktop) return null;

  return (
    <a
      href={DOWNLOAD_URL}
      className="rounded-lg border border-zinc-700 px-6 py-3 text-base font-semibold text-zinc-200 transition hover:bg-zinc-800"
    >
      Windows програм татах
    </a>
  );
}
