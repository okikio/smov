import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MediaGrid } from "@/components/media/MediaGrid";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { UserIcon, UserIcons } from "@/components/UserIcon";
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

const LONG_PRESS_DURATION = 700; // 0.7 seconds

export function BookmarksPart({
  onItemsChange,
  onShowDetails,
}: {
  onItemsChange: (hasItems: boolean) => void;
  onShowDetails?: (media: MediaItem) => void;
}) {
  const { t } = useTranslation();
  const progressItems = useProgressStore((s) => s.items);
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark);
  const [editing, setEditing] = useState(false);
  const [gridRef] = useAutoAnimate<HTMLDivElement>();

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    onItemsChange(items.length > 0);
  }, [items, onItemsChange]);

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

  if (items.length === 0) return null;

  return (
    <div className="relative">
      {/* Grouped Bookmarks */}
      {Object.entries(groupedItems).map(([group, groupItems]) => {
        const { icon, name } = parseGroupString(group);
        return (
          <div key={group} className="mb-6">
            <SectionHeading
              title={name}
              customIcon={
                <span className="w-6 h-6 flex items-center justify-center">
                  <UserIcon icon={icon} className="w-full h-full" />
                </span>
              }
            >
              <EditButton
                editing={editing}
                onEdit={setEditing}
                id={`edit-button-bookmark-${group}`}
              />
            </SectionHeading>
            <MediaGrid>
              {groupItems.map((v) => (
                <div
                  key={v.id}
                  style={{ userSelect: "none" }}
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                >
                  <WatchedMediaCard
                    media={v}
                    closable={editing}
                    onClose={() => removeBookmark(v.id)}
                    onShowDetails={onShowDetails}
                  />
                </div>
              ))}
            </MediaGrid>
          </div>
        );
      })}

      {/* Regular Bookmarks */}
      {regularItems.length > 0 && (
        <div>
          <SectionHeading
            title={t("home.bookmarks.sectionTitle")}
            icon={Icons.BOOKMARK}
          >
            <EditButton
              editing={editing}
              onEdit={setEditing}
              id="edit-button-bookmark"
            />
          </SectionHeading>
          <MediaGrid ref={gridRef}>
            {regularItems.map((v) => (
              <div
                key={v.id}
                style={{ userSelect: "none" }}
                onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.preventDefault()
                }
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              >
                <WatchedMediaCard
                  media={v}
                  closable={editing}
                  onClose={() => removeBookmark(v.id)}
                  onShowDetails={onShowDetails}
                />
              </div>
            ))}
          </MediaGrid>
        </div>
      )}
    </div>
  );
}
