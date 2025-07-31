import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { EditButton } from "@/components/buttons/EditButton";
import { EditButtonWithText } from "@/components/buttons/EditButtonWithText";
import { Item, SortableList } from "@/components/form/SortableList";
import { Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { UserIcon, UserIcons } from "@/components/UserIcon";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
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
  const backendUrl = useBackendUrl();
  const account = useAuthStore((s) => s.account);

  // Group order editing state
  const groupOrder = useGroupOrderStore((s) => s.groupOrder);
  const setGroupOrder = useGroupOrderStore((s) => s.setGroupOrder);
  const editOrderModal = useModal("bookmark-edit-order-carousel");
  const [tempGroupOrder, setTempGroupOrder] = useState<string[]>([]);

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
      if (Array.isArray(bookmark?.group)) {
        bookmark.group.forEach((groupName) => {
          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }
          grouped[groupName].push(item);
        });
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

  // group sorting
  const allGroups = useMemo(() => {
    const groups = new Set<string>();

    Object.values(bookmarks).forEach((bookmark) => {
      if (Array.isArray(bookmark.group)) {
        bookmark.group.forEach((group) => groups.add(group));
      }
    });

    groups.add("bookmarks");

    return Array.from(groups);
  }, [bookmarks]);

  const sortableItems = useMemo(() => {
    const currentOrder = editOrderModal.isShown ? tempGroupOrder : groupOrder;

    if (currentOrder.length === 0) {
      return allGroups.map((group) => {
        const { name } = parseGroupString(group);
        return {
          id: group,
          name: group === "bookmarks" ? t("home.bookmarks.sectionTitle") : name,
        } as Item;
      });
    }

    const orderMap = new Map(
      currentOrder.map((group, index) => [group, index]),
    );
    const sortedGroups = allGroups.sort((groupA, groupB) => {
      const orderA = orderMap.has(groupA)
        ? orderMap.get(groupA)!
        : Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.has(groupB)
        ? orderMap.get(groupB)!
        : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return sortedGroups.map((group) => {
      const { name } = parseGroupString(group);
      return {
        id: group,
        name: group === "bookmarks" ? t("home.bookmarks.sectionTitle") : name,
      } as Item;
    });
  }, [allGroups, t, editOrderModal.isShown, tempGroupOrder, groupOrder]);

  // Create a unified list of sections including both grouped and regular bookmarks
  const sortedSections = useMemo(() => {
    const sections: Array<{
      type: "grouped" | "regular";
      group?: string;
      items: MediaItem[];
    }> = [];

    // Create a combined map of all sections (grouped + regular)
    const allSections = new Map<string, MediaItem[]>();

    // Add grouped sections
    Object.entries(groupedItems).forEach(([group, groupItems]) => {
      allSections.set(group, groupItems);
    });

    // Add regular bookmarks as "bookmarks" group
    if (regularItems.length > 0) {
      allSections.set("bookmarks", regularItems);
    }

    // Sort sections based on group order
    if (groupOrder.length === 0) {
      // No order set, use default order
      allSections.forEach((sectionItems, group) => {
        if (group === "bookmarks") {
          sections.push({ type: "regular", items: sectionItems });
        } else {
          sections.push({ type: "grouped", group, items: sectionItems });
        }
      });
    } else {
      // Use the saved order
      const orderMap = new Map(
        groupOrder.map((group, index) => [group, index]),
      );

      Array.from(allSections.entries())
        .sort(([groupA], [groupB]) => {
          const orderA = orderMap.has(groupA)
            ? orderMap.get(groupA)!
            : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(groupB)
            ? orderMap.get(groupB)!
            : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })
        .forEach(([group, sectionItems]) => {
          if (group === "bookmarks") {
            sections.push({ type: "regular", items: sectionItems });
          } else {
            sections.push({ type: "grouped", group, items: sectionItems });
          }
        });
    }

    return sections;
  }, [groupedItems, regularItems, groupOrder]);
  // kill me

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

  const handleEditGroupOrder = () => {
    // Initialize with current order or default order
    if (groupOrder.length === 0) {
      const defaultOrder = allGroups.map((group) => group);
      setTempGroupOrder(defaultOrder);
    } else {
      setTempGroupOrder([...groupOrder]);
    }
    editOrderModal.show();
  };

  const handleReorderClick = () => {
    handleEditGroupOrder();
    // Keep editing state active by setting it to true
    setEditing(true);
  };

  const handleCancelOrder = () => {
    editOrderModal.hide();
  };

  const handleSaveOrderClick = () => {
    setGroupOrder(tempGroupOrder);
    editOrderModal.hide();

    // Save to backend
    if (backendUrl && account) {
      useGroupOrderStore
        .getState()
        .saveGroupOrderToBackend(backendUrl, account);
    }
  };

  const categorySlug = "bookmarks";
  const SKELETON_COUNT = 10;

  if (bookmarksLength === 0) return null;

  return (
    <>
      {/* Grouped Bookmarks Carousels */}
      {sortedSections.map((section) => {
        if (section.type === "grouped") {
          const { icon, name } = parseGroupString(section.group || "");
          return (
            <div key={section.group || "bookmarks"}>
              <SectionHeading
                title={name}
                customIcon={
                  <span className="w-6 h-6 flex items-center justify-center">
                    <UserIcon icon={icon} className="w-full h-full" />
                  </span>
                }
                className="ml-4 md:ml-12 mt-2 -mb-5"
              >
                <div className="mr-4 md:mr-8 flex items-center gap-2">
                  {editing && allGroups.length > 1 && (
                    <EditButtonWithText
                      editing={editing}
                      onEdit={handleReorderClick}
                      id="edit-group-order-button-carousel"
                      text={t("home.bookmarks.groups.reorder.button")}
                      secondaryText={t("home.bookmarks.groups.reorder.done")}
                    />
                  )}
                  <EditButton
                    editing={editing}
                    onEdit={setEditing}
                    id={`edit-button-bookmark-${section.group}`}
                  />
                </div>
              </SectionHeading>
              <div className="relative overflow-hidden carousel-container md:pb-4">
                <div
                  id={`carousel-${section.group}`}
                  className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
                  ref={(el) => {
                    carouselRefs.current[section.group || "bookmarks"] = el;
                  }}
                  onWheel={handleWheel}
                >
                  <div className="md:w-12" />

                  {section.items.map((media) => (
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
                    categorySlug={section.group || "bookmarks"}
                    carouselRefs={carouselRefs}
                  />
                )}
              </div>
            </div>
          );
        } // regular items
        return (
          <div key="regular-bookmarks">
            <SectionHeading
              title={t("home.bookmarks.sectionTitle") || "Bookmarks"}
              icon={Icons.BOOKMARK}
              className="ml-4 md:ml-12 mt-2 -mb-5"
            >
              <div className="mr-4 md:mr-8 flex items-center gap-2">
                {editing && allGroups.length > 1 && (
                  <EditButtonWithText
                    editing={editing}
                    onEdit={handleReorderClick}
                    id="edit-group-order-button-carousel"
                    text={t("home.bookmarks.groups.reorder.button")}
                    secondaryText={t("home.bookmarks.groups.reorder.done")}
                  />
                )}
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

                {section.items.length > 0
                  ? section.items.map((media) => (
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
          </div>
        );
      })}

      {/* Edit Order Modal */}
      <Modal id={editOrderModal.id}>
        <ModalCard>
          <Heading2 className="!mt-0">
            {t("home.bookmarks.groups.reorder.title")}
          </Heading2>
          <Paragraph>
            {t("home.bookmarks.groups.reorder.description")}
          </Paragraph>
          <div className="mt-6">
            <SortableList
              items={sortableItems}
              setItems={(newItems) => {
                const newOrder = newItems.map((item) => item.id);
                setTempGroupOrder(newOrder);
              }}
            />
          </div>
          <div className="flex gap-4 mt-6 justify-end">
            <Button theme="secondary" onClick={handleCancelOrder}>
              {t("home.bookmarks.groups.reorder.cancel")}
            </Button>
            <Button theme="purple" onClick={handleSaveOrderClick}>
              {t("home.bookmarks.groups.reorder.save")}
            </Button>
          </div>
        </ModalCard>
      </Modal>
    </>
  );
}
