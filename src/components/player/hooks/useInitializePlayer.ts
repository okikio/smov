import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import { useVolumeStore } from "@/stores/volume";

import { useCaptions } from "./useCaptions";

export function useInitializePlayer() {
  const display = usePlayerStore((s) => s.display);
  const volume = useVolumeStore((s) => s.volume);

  const init = useCallback(() => {
    display?.setVolume(volume);
  }, [display, volume]);

  return {
    init,
  };
}

export function useInitializeSource() {
  const source = usePlayerStore((s) => s.source);
  const sourceIdentifier = useMemo(
    () => (source ? JSON.stringify(source) : null),
    [source],
  );
  const captionList = usePlayerStore((s) => s.captionList);
  const isLoadingExternalSubtitles = usePlayerStore(
    (s) => s.isLoadingExternalSubtitles,
  );
  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const enabled = useSubtitleStore((s) => s.enabled);
  const { selectLastUsedLanguageIfEnabled } = useCaptions();

  // Trigger re-run when HLS tracks may have loaded (they load after manifest)
  const [hlsRetryTrigger, setHlsRetryTrigger] = useState(0);
  const hasRetriedForSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceIdentifier || !enabled) return;

    // Wait for external subtitles to finish loading before selecting
    // This ensures we have the full caption list (provider + external) before picking
    if (isLoadingExternalSubtitles) return;

    const captions =
      captionList.length > 0 ? captionList : (getHlsCaptionList?.() ?? []);
    if (captions.length === 0) {
      // For HLS sources, tracks may load after manifest - retry once per source
      const alreadyRetried =
        hasRetriedForSourceRef.current === sourceIdentifier;
      if (source?.type === "hls" && !alreadyRetried) {
        hasRetriedForSourceRef.current = sourceIdentifier;
        const retryTimer = setTimeout(
          () => setHlsRetryTrigger((n) => n + 1),
          2000,
        );
        return () => clearTimeout(retryTimer);
      }
      return;
    }

    selectLastUsedLanguageIfEnabled();
  }, [
    sourceIdentifier,
    source?.type,
    enabled,
    isLoadingExternalSubtitles,
    captionList,
    getHlsCaptionList,
    selectLastUsedLanguageIfEnabled,
    hlsRetryTrigger,
  ]);
}
