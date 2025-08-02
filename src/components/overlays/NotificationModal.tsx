import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Link } from "@/pages/migration/utils";
import { useOverlayStack } from "@/stores/interface/overlayStack";

import { FancyModal } from "./Modal";

const DEFAULT_FEEDS = ["/notifications.xml"];
const CORS_PROXY = "http://api.allorigins.win/get?url=";

const getAllFeeds = (): string[] => {
  try {
    const savedCustomFeeds = localStorage.getItem("notification-custom-feeds");
    if (savedCustomFeeds) {
      const customFeeds = JSON.parse(savedCustomFeeds);
      return [...DEFAULT_FEEDS, ...customFeeds];
    }
  } catch (e) {
    // Silently fail and return default feeds
  }
  return DEFAULT_FEEDS;
};

const getFetchUrl = (feedUrl: string): string => {
  if (feedUrl.startsWith("/")) {
    return feedUrl;
  }
  return `${CORS_PROXY}${encodeURIComponent(feedUrl)}`;
};

const getSourceName = (feedUrl: string): string => {
  if (feedUrl === "/notifications.xml") {
    return "P-Stream";
  }

  try {
    const url = new URL(feedUrl);
    return url.hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
};

interface NotificationItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  source?: string;
}

interface NotificationModalProps {
  id: string;
}

type ModalView = "list" | "detail" | "settings";

// Detail view component
function DetailView({
  selectedNotification,
  goBackToList,
  getCategoryColor,
  getCategoryLabel,
  formatDate,
  isRead,
  toggleReadStatus,
}: {
  selectedNotification: NotificationItem;
  goBackToList: () => void;
  getCategoryColor: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  formatDate: (dateString: string) => string;
  isRead: boolean;
  toggleReadStatus: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header with back button and toggle read status */}
      <div className="flex md:flex-row flex-col items-start justify-between gap-4 pb-4 border-b border-utils-divider">
        <button
          type="button"
          onClick={goBackToList}
          className="text-type-link hover:text-type-linkHover transition-colors flex items-center gap-1"
        >
          <Icon icon={Icons.CHEVRON_LEFT} />
          <span>Back to notifications</span>
        </button>
        <div>
          <button
            type="button"
            onClick={toggleReadStatus}
            className={`text-sm transition-colors flex items-center gap-2 px-3 py-1 rounded-md ${
              isRead
                ? "text-type-link hover:text-type-linkHover bg-background-main/50 hover:bg-background-main/70"
                : "text-type-secondary hover:text-white bg-background-main/30 hover:bg-background-main/50"
            }`}
          >
            <Icon icon={isRead ? Icons.EYE_SLASH : Icons.EYE} />
            <span>{isRead ? "Mark as unread" : "Mark as read"}</span>
          </button>
        </div>
      </div>

      {/* Notification content */}
      <div className="space-y-4 overflow-y-auto max-h-[70vh] md:max-h-[60vh]">
        <div className="flex items-center gap-2">
          {getCategoryColor(selectedNotification.category) && (
            <span
              className={`inline-block w-3 h-3 rounded-full ${getCategoryColor(
                selectedNotification.category,
              )}`}
            />
          )}
          {getCategoryLabel(selectedNotification.category) && (
            <>
              <span className="text-sm text-type-secondary">
                {getCategoryLabel(selectedNotification.category)}
              </span>
              {selectedNotification.source && (
                <>
                  <span className="text-sm text-type-secondary">•</span>
                  <span className="text-sm text-type-secondary">
                    {selectedNotification.source}
                  </span>
                </>
              )}
              <span className="text-sm text-type-secondary">•</span>
              <span className="text-sm text-type-secondary">
                {formatDate(selectedNotification.pubDate)}
              </span>
            </>
          )}
          {!getCategoryLabel(selectedNotification.category) && (
            <>
              {selectedNotification.source && (
                <>
                  <span className="text-sm text-type-secondary">
                    {selectedNotification.source}
                  </span>
                  <span className="text-sm text-type-secondary">•</span>
                </>
              )}
              <span className="text-sm text-type-secondary">
                {formatDate(selectedNotification.pubDate)}
              </span>
            </>
          )}
        </div>

        <div className="prose prose-invert max-w-none">
          <div
            className="text-type-secondary leading-relaxed"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: selectedNotification.description
                .replace(/\n\n/g, "</p><p>")
                .replace(/\n- /g, "</p><p>• ")
                .replace(/\n\*\*([^*]+)\*\*/g, "</p><h4>$1</h4><p>")
                .replace(/^/, "<p>")
                .replace(/$/, "</p>")
                .replace(/<p><\/p>/g, "")
                .replace(
                  /<p>• /g,
                  '<p class="flex items-start gap-2"><span class="text-type-link mt-1">•</span><span>',
                )
                .replace(/<\/p>/g, "</span></p>"),
            }}
          />
        </div>

        {selectedNotification.link && (
          <div className="pt-4 border-t border-utils-divider">
            <Link href={selectedNotification.link} target="_blank">
              <Icon icon={Icons.LINK} />
              <span>Go to page</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings view component
function SettingsView({
  autoReadDays,
  setAutoReadDays,
  customFeeds,
  setCustomFeeds,
  markAllAsUnread,
  onClose,
}: {
  autoReadDays: number;
  setAutoReadDays: (days: number) => void;
  customFeeds: string[];
  setCustomFeeds: (feeds: string[]) => void;
  markAllAsUnread: () => void;
  onClose: () => void;
}) {
  const addCustomFeed = () => {
    setCustomFeeds([...customFeeds, ""]);
  };

  const changeCustomFeed = (index: number, val: string) => {
    setCustomFeeds(
      customFeeds.map((v, i) => {
        if (i !== index) return v;
        return val;
      }),
    );
  };

  const removeCustomFeed = (index: number) => {
    setCustomFeeds(customFeeds.filter((v, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-4 border-b border-utils-divider">
        <button
          type="button"
          onClick={onClose}
          className="text-type-link hover:text-type-linkHover transition-colors flex items-center gap-1"
        >
          <Icon icon={Icons.CHEVRON_LEFT} />
          <span>Back to notifications</span>
        </button>
      </div>

      {/* Settings content */}
      <div className="space-y-6 overflow-y-auto max-h-[70vh] md:max-h-[60vh]">
        {/* Mark all as unread section */}
        <div className="bg-background-main/30 rounded-lg p-4 border border-utils-divider">
          <h3 className="text-white font-bold mb-3">Mark All as Unread</h3>
          <p className="text-sm text-type-secondary mb-4">
            Permanently mark all notifications as unread. This action cannot be
            undone.
          </p>
          <button
            type="button"
            onClick={markAllAsUnread}
            className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-md border border-red-400/30 hover:border-red-400/50"
          >
            Mark All as Unread
          </button>
        </div>

        {/* Auto-read days section */}
        <div className="bg-background-main/30 rounded-lg p-4 border border-utils-divider">
          <h3 className="text-white font-bold mb-3">Auto-Mark as Read</h3>
          <p className="text-sm text-type-secondary mb-4">
            Automatically mark notifications as read after this many days.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="365"
              value={autoReadDays}
              onChange={(e) =>
                setAutoReadDays(parseInt(e.target.value, 10) || 14)
              }
              className="bg-background-secondary border border-type-secondary rounded px-3 py-2 text-white w-20"
            />
            <span className="text-sm text-type-secondary">days</span>
          </div>
        </div>

        {/* Custom feeds section */}
        <div className="bg-background-main/30 rounded-lg p-4 border border-utils-divider">
          <h3 className="text-white font-bold mb-3">Custom RSS Feeds</h3>
          <p className="text-sm text-type-secondary mb-4">
            Add custom RSS feeds to receive notifications from other sources.
            <br />
            <span className="text-sm text-type-danger">
              Note: This feature is experimental and may not work for all feeds.
            </span>
          </p>

          <div className="space-y-2 max-w-md">
            {customFeeds.length === 0 ? (
              <p className="text-sm text-type-secondary">
                No custom feeds added
              </p>
            ) : null}
            {customFeeds.map((feed, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="grid grid-cols-[1fr,auto] items-center gap-2"
              >
                <input
                  type="url"
                  value={feed}
                  onChange={(e) => changeCustomFeed(i, e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="bg-background-secondary border border-type-secondary rounded px-3 py-2 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCustomFeed(i)}
                  className="h-full scale-90 hover:scale-100 rounded-full aspect-square bg-authentication-inputBg hover:bg-authentication-inputBgHover flex justify-center items-center transition-transform duration-200 hover:text-white cursor-pointer"
                >
                  <Icon className="text-xl" icon={Icons.X} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCustomFeed}
            className="mt-3 text-sm text-type-link hover:text-type-linkHover transition-colors px-3 py-1 rounded-md border border-type-link/30 hover:border-type-link/50"
          >
            Add Custom Feed
          </button>
        </div>
      </div>
    </div>
  );
}

// List view component
function ListView({
  notifications,
  readNotifications,
  unreadCount,
  loading,
  error,
  containerRef,
  markAllAsRead,
  markAllAsUnread,
  isShiftHeld,
  onRefresh,
  onOpenSettings,
  openNotificationDetail,
  getCategoryColor,
  getCategoryLabel,
  formatDate,
}: {
  notifications: NotificationItem[];
  readNotifications: Set<string>;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  markAllAsRead: () => void;
  markAllAsUnread: () => void;
  isShiftHeld: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  openNotificationDetail: (notification: NotificationItem) => void;
  getCategoryColor: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  formatDate: (dateString: string) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Header with refresh and mark all buttons */}
      <div className="flex gap-4 items-center pb-4 border-b border-utils-divider">
        <div className="flex flex-col md:flex-row justify-start md:gap-2">
          <span className="text-sm text-type-secondary">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {isShiftHeld ? (
              <button
                type="button"
                onClick={markAllAsUnread}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Mark all as unread
              </button>
            ) : (
              unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-sm text-type-link hover:text-type-linkHover transition-colors"
                >
                  Mark all as read
                </button>
              )
            )}
          </div>
        </div>
        <div className="flex-1 flex justify-end gap-2 md:mr-4">
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-sm text-type-secondary hover:text-white transition-colors"
          >
            <Icon icon={Icons.SETTINGS} />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-sm text-type-secondary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              icon={Icons.RELOAD}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Icon
            icon={Icons.RELOAD}
            className="animate-spin rounded-full text-type-secondary text-[2rem]"
          />
          <span className="ml-3 text-type-secondary">Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Icon icon={Icons.WARNING} className="text-[2rem] text-red-400" />
          <p className="text-red-400 mb-2">Failed to load notifications</p>
          <p className="text-sm text-type-secondary">{error}</p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && !error && (
        <div
          ref={containerRef}
          className="space-y-4 overflow-y-auto max-h-[70vh] md:max-h-[60vh]"
        >
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Icon
                icon={Icons.BELL}
                className="text-type-secondary text-[2rem]"
              />
              <p className="text-type-secondary">No notifications available</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const isRead = readNotifications.has(notification.guid);
              return (
                <div
                  key={notification.guid}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-background-main/50 mr-2 ${
                    isRead
                      ? "bg-background-main border-utils-divider opacity-75"
                      : "bg-background-main border-type-link/70 shadow-sm"
                  }`}
                  onClick={() => openNotificationDetail(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap order-2 sm:order-1">
                          <h3
                            className={`font-medium ${
                              isRead ? "text-type-secondary" : "text-white"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!isRead && (
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 order-1 sm:order-2">
                          {/* Mobile: Source • Category */}
                          <div className="flex items-center gap-1 sm:hidden">
                            {getCategoryColor(notification.category) && (
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${getCategoryColor(
                                  notification.category,
                                )}`}
                              />
                            )}
                            <span className="text-xs text-type-secondary">
                              {getCategoryLabel(notification.category)}
                            </span>
                            {notification.source && (
                              <>
                                <span className="text-xs text-type-secondary">
                                  •
                                </span>
                                <span className="text-xs text-type-secondary">
                                  {notification.source}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Desktop: Source above Category */}
                          <div className="hidden sm:flex sm:flex-col sm:items-start sm:gap-1">
                            {notification.source && (
                              <span className="text-xs text-type-secondary font-medium">
                                {notification.source}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {getCategoryColor(notification.category) && (
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${getCategoryColor(
                                    notification.category,
                                  )}`}
                                />
                              )}
                              <span className="text-xs text-type-secondary">
                                {getCategoryLabel(notification.category)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-type-secondary mb-2 line-clamp-2 max-w-[12rem] md:max-w-[30rem] md:pr-8">
                        {notification.description
                          .replace(/\n/g, " ")
                          .substring(0, 150)}
                        {notification.description.length > 150 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-type-secondary">
                      {formatDate(notification.pubDate)}
                    </span>
                    <Icon
                      icon={Icons.CHEVRON_RIGHT}
                      className="text-type-link"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationModal({ id }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set(),
  );
  const [currentView, setCurrentView] = useState<ModalView>("list");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [autoReadDays, setAutoReadDays] = useState<number>(14);
  const [customFeeds, setCustomFeeds] = useState<string[]>([]);

  // Load read notifications and settings from localStorage
  useEffect(() => {
    const savedRead = localStorage.getItem("read-notifications");
    if (savedRead) {
      try {
        const readArray = JSON.parse(savedRead);
        setReadNotifications(new Set(readArray));
      } catch (e) {
        console.error("Failed to parse read notifications:", e);
      }
    }

    // Load settings
    const savedAutoReadDays = localStorage.getItem(
      "notification-auto-read-days",
    );
    if (savedAutoReadDays) {
      try {
        setAutoReadDays(parseInt(savedAutoReadDays, 10));
      } catch (e) {
        console.error("Failed to parse auto read days:", e);
      }
    }

    const savedCustomFeeds = localStorage.getItem("notification-custom-feeds");
    if (savedCustomFeeds) {
      try {
        setCustomFeeds(JSON.parse(savedCustomFeeds));
      } catch (e) {
        console.error("Failed to parse custom feeds:", e);
      }
    }
  }, []);

  // Handle shift key for mark all as unread button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Fetch RSS feed function
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allNotifications: NotificationItem[] = [];
      const autoReadGuids: string[] = [];

      // Mark notifications older than autoReadDays as read
      const autoReadDate = new Date();
      autoReadDate.setDate(autoReadDate.getDate() - autoReadDays);

      // Get all feeds (default + custom)
      const feeds = getAllFeeds();

      // Fetch from all feeds
      for (const feedUrl of feeds) {
        if (!feedUrl.trim()) continue;

        try {
          const fetchUrl = getFetchUrl(feedUrl);
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const responseText = await response.text();

            // Handle CORS proxy response (JSON wrapper)
            let xmlText = responseText;
            try {
              const jsonResponse = JSON.parse(responseText);
              if (jsonResponse.contents) {
                xmlText = jsonResponse.contents;
              }
            } catch {
              // If it's not JSON, assume it's direct XML
              xmlText = responseText;
            }

            // Basic validation that we got XML content
            if (
              xmlText &&
              (xmlText.includes("<rss") || xmlText.includes("<feed"))
            ) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "text/xml");

              // Check for parsing errors
              const parserError = xmlDoc.querySelector("parsererror");
              if (!parserError && xmlDoc && xmlDoc.documentElement) {
                const items = xmlDoc.querySelectorAll("item");
                if (items && items.length > 0) {
                  items.forEach((item) => {
                    try {
                      const guid =
                        item.querySelector("guid")?.textContent || "";
                      const title =
                        item.querySelector("title")?.textContent || "";
                      const link =
                        item.querySelector("link")?.textContent || "";
                      const description =
                        item.querySelector("description")?.textContent || "";
                      const pubDate =
                        item.querySelector("pubDate")?.textContent || "";
                      const category =
                        item.querySelector("category")?.textContent || "";

                      // Skip items without essential data
                      if (!guid || !title) {
                        return;
                      }

                      // Parse the publication date
                      const notificationDate = new Date(pubDate);

                      allNotifications.push({
                        guid,
                        title,
                        link,
                        description,
                        pubDate,
                        category,
                        source: getSourceName(feedUrl),
                      });

                      // Collect GUIDs of notifications older than autoReadDays
                      if (notificationDate <= autoReadDate) {
                        autoReadGuids.push(guid);
                      }
                    } catch (itemError) {
                      // Skip malformed items
                      console.warn("Skipping malformed RSS item:", itemError);
                    }
                  });
                }
              }
            }
          }
        } catch (customFeedError) {
          // Silently fail for individual feed errors
        }
      }

      setNotifications(allNotifications);

      // Update read notifications after setting notifications
      if (autoReadGuids.length > 0) {
        setReadNotifications((prevReadSet) => {
          const newReadSet = new Set(prevReadSet);
          autoReadGuids.forEach((guid) => newReadSet.add(guid));

          // Update localStorage
          localStorage.setItem(
            "read-notifications",
            JSON.stringify(Array.from(newReadSet)),
          );

          return newReadSet;
        });
      }
    } catch (err) {
      console.error("RSS fetch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
      // Set empty notifications to prevent crashes
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [autoReadDays]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh function
  const handleRefresh = () => {
    fetchNotifications();
  };

  // Save read notifications to cookie
  const markAsRead = (guid: string) => {
    const newReadSet = new Set(readNotifications);
    newReadSet.add(guid);
    setReadNotifications(newReadSet);

    // Save to localStorage
    localStorage.setItem(
      "read-notifications",
      JSON.stringify(Array.from(newReadSet)),
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    const allGuids = notifications.map((n) => n.guid);
    const newReadSet = new Set(allGuids);
    setReadNotifications(newReadSet);
    localStorage.setItem(
      "read-notifications",
      JSON.stringify(Array.from(newReadSet)),
    );
  };

  // Mark all as unread
  const markAllAsUnread = () => {
    setReadNotifications(new Set());
    localStorage.setItem("read-notifications", JSON.stringify([]));
  };

  // Navigate to detail view
  const openNotificationDetail = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setCurrentView("detail");
    markAsRead(notification.guid);
  };

  // Navigate back to list
  const goBackToList = () => {
    setCurrentView("list");
    setSelectedNotification(null);
  };

  // Settings functions
  const openSettings = () => {
    setCurrentView("settings");
  };

  const closeSettings = () => {
    setCurrentView("list");
  };

  // Save settings functions
  const saveAutoReadDays = (days: number) => {
    setAutoReadDays(days);
    localStorage.setItem("notification-auto-read-days", days.toString());
  };

  const saveCustomFeeds = (feeds: string[]) => {
    setCustomFeeds(feeds);
    localStorage.setItem("notification-custom-feeds", JSON.stringify(feeds));
  };

  // Scroll to last read notification
  useEffect(() => {
    if (
      notifications.length > 0 &&
      containerRef.current &&
      currentView === "list"
    ) {
      const lastReadIndex = notifications.findIndex(
        (n) => !readNotifications.has(n.guid),
      );
      if (lastReadIndex > 0) {
        const element = containerRef.current.children[
          lastReadIndex
        ] as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [notifications, readNotifications, currentView]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryColor = (category: string) => {
    if (!category || category.trim() === "") {
      return "";
    }

    switch (category.toLowerCase()) {
      case "announcement":
        return "bg-blue-500";
      case "feature":
        return "bg-green-500";
      case "update":
        return "bg-yellow-500";
      case "bugfix":
        return "bg-red-500";
      default:
        return "";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case "announcement":
        return "Announcement";
      case "feature":
        return "New Feature";
      case "update":
        return "Update";
      case "bugfix":
        return "Bug Fix";
      default:
        return category;
    }
  };

  const unreadCount = notifications.filter(
    (n) => !readNotifications.has(n.guid),
  ).length;

  // Don't render if there's a critical error
  if (error && !loading) {
    return (
      <FancyModal id={id} title="Notifications" size="lg">
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Icon icon={Icons.WARNING} className="text-[2rem] text-red-400" />
          <p className="text-red-400 mb-2">Failed to load notifications</p>
          <p className="text-sm text-type-secondary">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 text-sm text-type-link hover:text-type-linkHover transition-colors"
          >
            Try again
          </button>
        </div>
      </FancyModal>
    );
  }

  return (
    <FancyModal
      id={id}
      title={
        currentView === "list"
          ? "Notifications"
          : currentView === "detail" && selectedNotification
            ? selectedNotification.title
            : currentView === "settings"
              ? "Settings"
              : "Notifications"
      }
      size="lg"
    >
      {currentView === "list" ? (
        <ListView
          notifications={notifications}
          readNotifications={readNotifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          containerRef={containerRef}
          markAllAsRead={markAllAsRead}
          markAllAsUnread={markAllAsUnread}
          isShiftHeld={isShiftHeld}
          onRefresh={handleRefresh}
          onOpenSettings={openSettings}
          openNotificationDetail={openNotificationDetail}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          formatDate={formatDate}
        />
      ) : currentView === "detail" && selectedNotification ? (
        <DetailView
          selectedNotification={selectedNotification}
          goBackToList={goBackToList}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          formatDate={formatDate}
          isRead={readNotifications.has(selectedNotification.guid)}
          toggleReadStatus={() => {
            if (readNotifications.has(selectedNotification.guid)) {
              // Mark as unread
              const newReadSet = new Set(readNotifications);
              newReadSet.delete(selectedNotification.guid);
              setReadNotifications(newReadSet);
              localStorage.setItem(
                "read-notifications",
                JSON.stringify(Array.from(newReadSet)),
              );
            } else {
              // Mark as read
              markAsRead(selectedNotification.guid);
            }
          }}
        />
      ) : currentView === "settings" ? (
        <SettingsView
          autoReadDays={autoReadDays}
          setAutoReadDays={saveAutoReadDays}
          customFeeds={customFeeds}
          setCustomFeeds={saveCustomFeeds}
          markAllAsUnread={markAllAsUnread}
          onClose={closeSettings}
        />
      ) : null}
    </FancyModal>
  );
}

// Hook to manage notifications
export function useNotifications() {
  const { showModal, hideModal, isModalVisible } = useOverlayStack();
  const modalId = "notifications";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Fetch notifications for badge count
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const allNotifications: NotificationItem[] = [];

        // Get all feeds (default + custom)
        const feeds = getAllFeeds();

        // Fetch from all feeds
        for (const feedUrl of feeds) {
          if (!feedUrl.trim()) continue;

          try {
            const fetchUrl = getFetchUrl(feedUrl);
            const response = await fetch(fetchUrl);
            if (response.ok) {
              const responseText = await response.text();

              // Handle CORS proxy response (JSON wrapper)
              let xmlText = responseText;
              try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.contents) {
                  xmlText = jsonResponse.contents;
                }
              } catch {
                // If it's not JSON, assume it's direct XML
                xmlText = responseText;
              }

              // Basic validation that we got XML content
              if (
                xmlText &&
                (xmlText.includes("<rss") || xmlText.includes("<feed"))
              ) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                // Check for parsing errors
                const parserError = xmlDoc.querySelector("parsererror");
                if (!parserError && xmlDoc && xmlDoc.documentElement) {
                  const items = xmlDoc.querySelectorAll("item");
                  if (items && items.length > 0) {
                    items.forEach((item) => {
                      try {
                        const guid =
                          item.querySelector("guid")?.textContent || "";
                        const title =
                          item.querySelector("title")?.textContent || "";
                        const link =
                          item.querySelector("link")?.textContent || "";
                        const description =
                          item.querySelector("description")?.textContent || "";
                        const pubDate =
                          item.querySelector("pubDate")?.textContent || "";
                        const category =
                          item.querySelector("category")?.textContent || "";

                        // Skip items without essential data
                        if (!guid || !title) {
                          return;
                        }

                        allNotifications.push({
                          guid,
                          title,
                          link,
                          description,
                          pubDate,
                          category,
                          source: getSourceName(feedUrl),
                        });
                      } catch (itemError) {
                        // Skip malformed items silently
                      }
                    });
                  }
                }
              }
            }
          } catch (customFeedError) {
            // Silently fail for individual feed errors
          }
        }

        setNotifications(allNotifications);
      } catch (err) {
        // Silently fail for badge count
      }
    };

    fetchNotifications();
  }, []);

  const openNotifications = () => {
    showModal(modalId);
  };

  const closeNotifications = () => {
    hideModal(modalId);
  };

  const isNotificationsOpen = () => {
    return isModalVisible(modalId);
  };

  // Get unread count for badge
  const getUnreadCount = () => {
    try {
      const savedRead = localStorage.getItem("read-notifications");
      if (!savedRead) return notifications.length;

      const readArray = JSON.parse(savedRead);
      const readSet = new Set(readArray);

      // Get the actual count from the notifications state
      return notifications.filter((n: NotificationItem) => !readSet.has(n.guid))
        .length;
    } catch {
      return 0;
    }
  };

  return {
    openNotifications,
    closeNotifications,
    isNotificationsOpen,
    getUnreadCount,
  };
}
