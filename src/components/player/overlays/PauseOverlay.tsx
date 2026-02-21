import { useEffect, useState } from "react";
import { useIdle } from "react-use";

import { getMediaLogo } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export function PauseOverlay() {
  const isIdle = useIdle(10e3); // 10 seconds
  const isPaused = usePlayerStore((s) => s.mediaPlaying.isPaused);
  const meta = usePlayerStore((s) => s.meta);
  const enablePauseOverlay = usePreferencesStore((s) => s.enablePauseOverlay);
  const enableImageLogos = usePreferencesStore((s) => s.enableImageLogos);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const shouldShow = isPaused && isIdle && enablePauseOverlay;

  useEffect(() => {
    let mounted = true;
    const fetchLogo = async () => {
      if (!meta?.tmdbId || !enableImageLogos) {
        setLogoUrl(null);
        return;
      }

      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const url = await getMediaLogo(meta.tmdbId, type);
        if (mounted) setLogoUrl(url || null);
      } catch {
        if (mounted) setLogoUrl(null);
      }
    };

    fetchLogo();
    return () => {
      mounted = false;
    };
  }, [meta?.tmdbId, meta?.type, enableImageLogos]);

  if (!meta) return null;

  const overview =
    meta.type === "show" ? meta.episode?.overview : meta.overview;

  // Don't render anything if we don't have content, but keep structure for fade if valid
  const hasContent = overview || logoUrl || meta.title;
  if (!hasContent) return null;

  return (
    <div
      className={`absolute inset-0 z-[60] flex items-center bg-black/60 transition-opacity duration-500 pointer-events-none ${
        shouldShow ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="ml-16 max-w-2xl p-8">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={meta.title}
            className="mb-6 max-h-32 object-contain drop-shadow-lg"
          />
        ) : (
          <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
            {meta.title}
          </h1>
        )}

        {meta.type === "show" && meta.episode && (
          <h2 className="mb-2 text-2xl font-semibold text-white/90 drop-shadow-md">
            {meta.episode.title}
          </h2>
        )}

        {overview && (
          <p className="text-lg text-white/80 drop-shadow-md line-clamp-6">
            {overview}
          </p>
        )}
      </div>
    </div>
  );
}
