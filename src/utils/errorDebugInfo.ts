import { detect } from "detect-browser";

import { usePlayerStore } from "@/stores/player/store";

export interface ErrorDebugInfo {
  timestamp: string;
  error: {
    message: string;
    type: string;
    stackTrace?: string;
  };
  device: {
    userAgent: string;
    browser: string;
    os: string;
    isMobile: boolean;
    isTV: boolean;
    screenResolution: string;
    viewportSize: string;
  };
  player: {
    status: string;
    sourceId: string | null;
    currentQuality: string | null;
    meta: {
      title: string;
      type: string;
      tmdbId: string;
      imdbId?: string;
      releaseYear: number;
      season?: number;
      episode?: number;
    } | null;
  };
  network: {
    online: boolean;
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };

  performance: {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    timing: {
      navigationStart: number;
      loadEventEnd: number;
      domContentLoadedEventEnd: number;
    };
  };
}

export function gatherErrorDebugInfo(error: any): ErrorDebugInfo {
  const browserInfo = detect();
  const isMobile = window.innerWidth <= 768;
  const isTV =
    /SmartTV|Tizen|WebOS|SamsungBrowser|HbbTV|Viera|NetCast|AppleTV|Android TV|GoogleTV|Roku|PlayStation|Xbox|Opera TV|AquosBrowser|Hisense|SonyBrowser|SharpBrowser|AFT|Chromecast/i.test(
      navigator.userAgent,
    );

  const playerStore = usePlayerStore.getState();

  // Get network information
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  // Get performance information
  const performanceInfo = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming;
  const memory = (performance as any).memory;

  return {
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message || error?.key || String(error),
      type: error?.type || "unknown",
      stackTrace: error?.stackTrace || error?.stack,
    },
    device: {
      userAgent: navigator.userAgent,
      browser: browserInfo?.name || "unknown",
      os: browserInfo?.os || "unknown",
      isMobile,
      isTV,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    },
    player: {
      status: playerStore.status,
      sourceId: playerStore.sourceId,
      currentQuality: playerStore.currentQuality,
      meta: playerStore.meta
        ? {
            title: playerStore.meta.title,
            type: playerStore.meta.type,
            tmdbId: playerStore.meta.tmdbId,
            imdbId: playerStore.meta.imdbId,
            releaseYear: playerStore.meta.releaseYear,
            season: playerStore.meta.season?.number,
            episode: playerStore.meta.episode?.number,
          }
        : null,
    },
    network: {
      online: navigator.onLine,
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    },
    performance: {
      memory: memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          }
        : undefined,
      timing: {
        navigationStart: performanceInfo?.fetchStart || 0,
        loadEventEnd: performanceInfo?.loadEventEnd || 0,
        domContentLoadedEventEnd:
          performanceInfo?.domContentLoadedEventEnd || 0,
      },
    },
  };
}

export function formatErrorDebugInfo(info: ErrorDebugInfo): string {
  const sections = [
    `=== ERROR DEBUG INFO ===`,
    `Timestamp: ${info.timestamp}`,
    ``,
    `=== ERROR DETAILS ===`,
    `Type: ${info.error.type}`,
    `Message: ${info.error.message}`,
    info.error.stackTrace ? `Stack Trace:\n${info.error.stackTrace}` : "",
    ``,
    `=== DEVICE INFO ===`,
    `Browser: ${info.device.browser} (${info.device.os})`,
    `User Agent: ${info.device.userAgent}`,
    `Screen: ${info.device.screenResolution}`,
    `Viewport: ${info.device.viewportSize}`,
    `Mobile: ${info.device.isMobile}`,
    `TV: ${info.device.isTV}`,
    ``,
    `=== PLAYER STATE ===`,
    `Status: ${info.player.status}`,
    `Source ID: ${info.player.sourceId || "null"}`,
    `Quality: ${info.player.currentQuality || "null"}`,
    info.player.meta
      ? [
          `Media: ${info.player.meta.title} (${info.player.meta.type})`,
          `TMDB ID: ${info.player.meta.tmdbId}`,
          info.player.meta.imdbId ? `IMDB ID: ${info.player.meta.imdbId}` : "",
          `Year: ${info.player.meta.releaseYear}`,
          info.player.meta.season ? `Season: ${info.player.meta.season}` : "",
          info.player.meta.episode
            ? `Episode: ${info.player.meta.episode}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "No media loaded",
    ``,
    `=== NETWORK INFO ===`,
    `Online: ${info.network.online}`,
    info.network.connectionType
      ? `Connection Type: ${info.network.connectionType}`
      : "",
    info.network.effectiveType
      ? `Effective Type: ${info.network.effectiveType}`
      : "",
    info.network.downlink ? `Downlink: ${info.network.downlink} Mbps` : "",
    info.network.rtt ? `RTT: ${info.network.rtt} ms` : "",
    ``,
    `=== PERFORMANCE ===`,
    info.performance.memory
      ? [
          `Memory Used: ${Math.round(info.performance.memory.usedJSHeapSize / 1024 / 1024)} MB`,
          `Memory Total: ${Math.round(info.performance.memory.totalJSHeapSize / 1024 / 1024)} MB`,
          `Memory Limit: ${Math.round(info.performance.memory.jsHeapSizeLimit / 1024 / 1024)} MB`,
        ].join("\n")
      : "Memory info not available",
  ];

  return sections.filter(Boolean).join("\n");
}
