import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { UserIcon, UserIcons } from "@/components/UserIcon";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/mediaTypes";

function parseGroupString(group: string): { icon: UserIcons; name: string } {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    const iconKey = match[1].toUpperCase() as keyof typeof UserIcons;
    const icon = UserIcons[iconKey] || UserIcons.BOOKMARK;
    const name = match[2].trim();
    return { icon, name };
  }
  return { icon: UserIcons.BOOKMARK, name: group };
}

interface BookmarksCarouselProps {
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
}

const LONG_PRESS_DURATION = 500; // 0.5 seconds

function MediaCardSkeleton() {
  return (
    <div className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <div className="animate-pulse">
        <div className="w-full aspect-[2/3] bg-mediaCard-hoverBackground rounded-lg" />
        <div className="mt-2 h-4 bg-mediaCard-hoverBackground rounded w-3/4" />
      </div>
    </div>
  );
}

export function BookmarksCarousel({
  carouselRefs,
  onShowDetails,
}: BookmarksCarouselProps) {
  const { t } = useTranslation();
  const browser = !!window.chrome;
  let isScrolling = false;
  const [editing, setEditing] = useState(false);
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isMobile } = useIsMobile();

  const bookmarksLength = useBookmarkStore(
    (state) => Object.keys(state.bookmarks).length,
  );

  const progressItems = useProgressStore((state) => state.items);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);

  const items = useMemo(() => {
    let output: MediaItem[] = [];
    Object.entries(bookmarks).forEach((entry) => {
      output.push({
        id: entry[0],
        ...entry[1],
      });
    });
    output = output.sort((a, b) => {
      const bookmarkA = bookmarks[a.id];
      const bookmarkB = bookmarks[b.id];
      const progressA = progressItems[a.id];
      const progressB = progressItems[b.id];

      const dateA = Math.max(bookmarkA.updatedAt, progressA?.updatedAt ?? 0);
      const dateB = Math.max(bookmarkB.updatedAt, progressB?.updatedAt ?? 0);

      return dateB - dateA;
    });
    return output;
  }, [bookmarks, progressItems]);

  const { groupedItems, regularItems } = useMemo(() => {
    const grouped: Record<string, MediaItem[]> = {};
    const regular: MediaItem[] = [];

    items.forEach((item) => {
      const bookmark = bookmarks[item.id];
      if (bookmark?.group) {
        if (!grouped[bookmark.group]) {
          grouped[bookmark.group] = [];
        }
        grouped[bookmark.group].push(item);
      } else {
        regular.push(item);
      }
    });

    // Sort items within each group by date
    Object.keys(grouped).forEach((group) => {
      grouped[group].sort((a, b) => {
        const bookmarkA = bookmarks[a.id];
        const bookmarkB = bookmarks[b.id];
        const progressA = progressItems[a.id];
        const progressB = progressItems[b.id];

        const dateA = Math.max(bookmarkA.updatedAt, progressA?.updatedAt ?? 0);
        const dateB = Math.max(bookmarkB.updatedAt, progressB?.updatedAt ?? 0);

        return dateB - dateA;
      });
    });

    return { groupedItems: grouped, regularItems: regular };
  }, [items, bookmarks, progressItems]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling) return;
    isScrolling = true;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (browser) {
      setTimeout(() => {
        isScrolling = false;
      }, 345);
    } else {
      isScrolling = false;
    }
  };

  const handleLongPress = () => {
    // Find the button by ID and simulate a click
    const editButton = document.getElementById("edit-button-bookmark");
    if (editButton) {
      (editButton as HTMLButtonElement).click();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default touch action
    pressTimerRef.current = setTimeout(handleLongPress, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default mouse action
    pressTimerRef.current = setTimeout(handleLongPress, LONG_PRESS_DURATION);
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const categorySlug = "bookmarks";
  const SKELETON_COUNT = 10;

  if (bookmarksLength === 0) return null;

  return (
    <>
      {/* Grouped Bookmarks Carousels */}
      {Object.entries(groupedItems).map(([group, groupItems]) => {
        const { icon, name } = parseGroupString(group);
        return (
          <div key={group}>
            <SectionHeading
              title={name}
              customIcon={
                <span className="w-6 h-6 flex items-center justify-center">
                  <UserIcon icon={icon} className="w-full h-full" />
                </span>
              }
              className="ml-4 md:ml-12 mt-2 -mb-5"
            >
              <div className="mr-4 md:mr-8">
                <EditButton
                  editing={editing}
                  onEdit={setEditing}
                  id={`edit-button-bookmark-${group}`}
                />
              </div>
            </SectionHeading>
            <div className="relative overflow-hidden carousel-container md:pb-4">
              <div
                id={`carousel-${group}`}
                className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
                ref={(el) => {
                  carouselRefs.current[group] = el;
                }}
                onWheel={handleWheel}
              >
                <div className="md:w-12" />

                {groupItems.map((media) => (
                  <div
                    key={media.id}
                    style={{ userSelect: "none" }}
                    onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                      e.preventDefault()
                    }
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                  >
                    <WatchedMediaCard
                      key={media.id}
                      media={media}
                      onShowDetails={onShowDetails}
                      closable={editing}
                      onClose={() => removeBookmark(media.id)}
                    />
                  </div>
                ))}

                <div className="md:w-12" />
              </div>

              {!isMobile && (
                <CarouselNavButtons
                  categorySlug={group}
                  carouselRefs={carouselRefs}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Regular Bookmarks Carousel */}
      {regularItems.length > 0 && (
        <>
          <SectionHeading
            title={t("home.bookmarks.sectionTitle") || "Bookmarks"}
            icon={Icons.BOOKMARK}
            className="ml-4 md:ml-12 mt-2 -mb-5"
          >
            <div className="mr-4 md:mr-8">
              <EditButton
                editing={editing}
                onEdit={setEditing}
                id="edit-button-bookmark"
              />
            </div>
          </SectionHeading>
          <div className="relative overflow-hidden carousel-container md:pb-4">
            <div
              id={`carousel-${categorySlug}`}
              className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
              ref={(el) => {
                carouselRefs.current[categorySlug] = el;
              }}
              onWheel={handleWheel}
            >
              <div className="md:w-12" />

              {regularItems.length > 0
                ? regularItems.map((media) => (
                    <div
                      key={media.id}
                      style={{ userSelect: "none" }}
                      onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                        e.preventDefault()
                      }
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                    >
                      <WatchedMediaCard
                        key={media.id}
                        media={media}
                        onShowDetails={onShowDetails}
                        closable={editing}
                        onClose={() => removeBookmark(media.id)}
                      />
                    </div>
                  ))
                : Array.from({ length: SKELETON_COUNT }).map(() => (
                    <MediaCardSkeleton
                      key={`skeleton-${categorySlug}-${Math.random().toString(36).substring(7)}`}
                    />
                  ))}

              <div className="md:w-12" />
            </div>

            {!isMobile && (
              <CarouselNavButtons
                categorySlug={categorySlug}
                carouselRefs={carouselRefs}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
