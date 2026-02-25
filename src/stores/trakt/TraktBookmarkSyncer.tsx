import { useCallback, useEffect, useRef, useState } from "react";
import { useInterval } from "react-use";

import { getPosterForMedia } from "@/backend/metadata/tmdb";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useTraktAuthStore } from "@/stores/trakt/store";
import { modifyBookmarks } from "@/utils/bookmarkModifications";
import { traktService } from "@/utils/trakt";
import { TraktContentData, TraktList } from "@/utils/traktTypes";

const TRAKT_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const INITIAL_SYNC_DELAY_MS = 2000; // Re-sync after backend restore

function listId(list: TraktList): string {
  return list.ids.slug ?? String(list.ids.trakt);
}

async function findListByName(
  username: string,
  groupName: string,
): Promise<TraktList | null> {
  const lists = await traktService.getLists(username);
  return lists.find((l) => l.name === groupName) ?? null;
}

async function ensureListExists(
  username: string,
  groupName: string,
): Promise<TraktList | null> {
  const existing = await findListByName(username, groupName);
  if (existing) return existing;
  try {
    return await traktService.createList(username, groupName);
  } catch {
    return null;
  }
}

export function TraktBookmarkSyncer() {
  const { traktUpdateQueue, removeTraktUpdateItem, replaceBookmarks } =
    useBookmarkStore();
  const { accessToken, user } = useTraktAuthStore();
  const isSyncingRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  // Sync from Local to Trakt
  useEffect(() => {
    if (!accessToken) return;

    const processQueue = async () => {
      const queue = [...traktUpdateQueue];
      if (queue.length === 0) return;

      const slug = user?.ids?.slug;
      const hasLists = Boolean(slug);

      for (const item of queue) {
        removeTraktUpdateItem(item.id);

        try {
          const contentData: TraktContentData = {
            title: item.title ?? "",
            year: item.year,
            tmdbId: item.tmdbId,
            type: (item.type === "movie" ? "movie" : "show") as
              | "movie"
              | "show"
              | "episode",
          };

          if (item.action === "add") {
            await traktService.addToWatchlist(contentData);
            if (hasLists && item.group?.length) {
              for (const groupName of item.group) {
                const list = await ensureListExists(slug!, groupName);
                if (list) {
                  await traktService.addToList(slug!, listId(list), [
                    contentData,
                  ]);
                }
              }
            }
          } else if (item.action === "delete") {
            await traktService.removeFromWatchlist(contentData);
            if (hasLists && item.group?.length) {
              for (const groupName of item.group) {
                const list = await findListByName(slug!, groupName);
                if (list) {
                  await traktService.removeFromList(slug!, listId(list), [
                    contentData,
                  ]);
                }
              }
            }
          }
        } catch (error) {
          console.error("Failed to sync bookmark to Trakt", error);
        }
      }
    };

    processQueue();
  }, [accessToken, user?.ids?.slug, traktUpdateQueue, removeTraktUpdateItem]);

  // Push local bookmarks to Trakt (watchlist + groups)
  const syncBookmarksToTrakt = useCallback(async () => {
    if (!accessToken || isSyncingRef.current) return;
    const slug = useTraktAuthStore.getState().user?.ids?.slug;
    if (!slug) return;
    isSyncingRef.current = true;
    try {
      if (!useTraktAuthStore.getState().user) {
        await traktService.getUserProfile();
      }
      const bookmarks = useBookmarkStore.getState().bookmarks;
      for (const [tmdbId, b] of Object.entries(bookmarks)) {
        try {
          const contentData: TraktContentData = {
            tmdbId,
            title: b.title,
            year: b.year,
            type: b.type === "movie" ? "movie" : "show",
          };
          await traktService.addToWatchlist(contentData);
          if (b.group?.length) {
            for (const groupName of b.group) {
              const list = await ensureListExists(slug, groupName);
              if (list) {
                await traktService.addToList(slug, listId(list), [contentData]);
              }
            }
          }
        } catch (err) {
          console.warn("Failed to push bookmark to Trakt:", tmdbId, err);
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [accessToken]);

  const syncWatchlistFromTrakt = useCallback(async () => {
    if (!accessToken || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      if (!useTraktAuthStore.getState().user) {
        await traktService.getUserProfile();
      }
      const watchlist = await traktService.getWatchlist();
      const store = useBookmarkStore.getState();
      const merged = { ...store.bookmarks };

      for (const item of watchlist) {
        const type = item.movie ? "movie" : "show";
        const media = item.movie || item.show;
        if (!media) continue;

        const tmdbId = media.ids.tmdb?.toString();
        if (!tmdbId) continue;

        if (!merged[tmdbId]) {
          const poster = await getPosterForMedia(tmdbId, type);
          merged[tmdbId] = {
            type: type as "movie" | "show",
            title: media.title,
            year: media.year,
            poster,
            updatedAt: Date.now(),
          };
        }
      }

      replaceBookmarks(merged);

      const slug = useTraktAuthStore.getState().user?.ids?.slug;
      if (slug) {
        try {
          const lists = await traktService.getLists(slug);
          const currentBookmarks = useBookmarkStore.getState().bookmarks;
          let modifiedBookmarks = { ...currentBookmarks };

          for (const list of lists) {
            const listTitle = list.name;
            const items = await traktService.getListItems(slug, listId(list));
            for (const li of items) {
              const media = li.movie || li.show;
              if (!media?.ids?.tmdb) continue;

              const tmdbId = media.ids.tmdb.toString();
              const type = li.movie ? "movie" : "show";
              const bookmark = modifiedBookmarks[tmdbId];

              if (!bookmark) {
                const poster = await getPosterForMedia(tmdbId, type);
                modifiedBookmarks[tmdbId] = {
                  type: type as "movie" | "show",
                  title: media.title,
                  year: media.year,
                  poster,
                  updatedAt: Date.now(),
                  group: [listTitle],
                };
              } else {
                const groups = bookmark.group ?? [];
                if (!groups.includes(listTitle)) {
                  const { modifiedBookmarks: next } = modifyBookmarks(
                    modifiedBookmarks,
                    [tmdbId],
                    { addGroups: [listTitle] },
                  );
                  modifiedBookmarks = next;
                }
              }
            }
          }

          const hasNewBookmarks =
            Object.keys(modifiedBookmarks).length !==
            Object.keys(currentBookmarks).length;
          const hasGroupChanges = Object.keys(modifiedBookmarks).some(
            (id) =>
              JSON.stringify(modifiedBookmarks[id]?.group ?? []) !==
              JSON.stringify(currentBookmarks[id]?.group ?? []),
          );
          if (hasNewBookmarks || hasGroupChanges) {
            replaceBookmarks(modifiedBookmarks);
          }
        } catch (listError) {
          console.warn("Failed to sync Trakt lists (groups)", listError);
        }
      }
    } catch (error) {
      console.error("Failed to sync Trakt watchlist to local", error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [accessToken, replaceBookmarks]);

  const fullSync = useCallback(async () => {
    await syncWatchlistFromTrakt(); // Pull Trakt → local, merge
    await syncBookmarksToTrakt(); // Push local → Trakt
  }, [syncWatchlistFromTrakt, syncBookmarksToTrakt]);

  // Wait for Trakt auth store to rehydrate from persist (accessToken may be null on first render)
  useEffect(() => {
    const check = () => {
      if (useTraktAuthStore.persist?.hasHydrated?.()) {
        setHydrated(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const unsub = useTraktAuthStore.persist?.onFinishHydration?.(() => {
      setHydrated(true);
    });
    const t = setTimeout(() => setHydrated(true), 500);
    return () => {
      unsub?.();
      clearTimeout(t);
    };
  }, []);

  // On mount (after hydration): pull immediately (Trakt → local)
  useEffect(() => {
    if (!hydrated || !accessToken) return;
    syncWatchlistFromTrakt();
    const t = setTimeout(fullSync, INITIAL_SYNC_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, accessToken, syncWatchlistFromTrakt, fullSync]);

  // Periodic full sync (pull + push)
  useInterval(fullSync, TRAKT_SYNC_INTERVAL_MS);

  return null;
}
