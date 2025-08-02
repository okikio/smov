import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Link } from "@/pages/migration/utils";
import { useOverlayStack } from "@/stores/interface/overlayStack";

import { FancyModal } from "./Modal";

const NOTIFICATIONS_ENDPOINT = "/notifications.xml";

interface NotificationItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

interface NotificationModalProps {
  id: string;
}

type ModalView = "list" | "detail";

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
              <span className="text-sm text-type-secondary">•</span>
              <span className="text-sm text-type-secondary">
                {formatDate(selectedNotification.pubDate)}
              </span>
            </>
          )}
          {!getCategoryLabel(selectedNotification.category) && (
            <span className="text-sm text-type-secondary">
              {formatDate(selectedNotification.pubDate)}
            </span>
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
  openNotificationDetail: (notification: NotificationItem) => void;
  getCategoryColor: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  formatDate: (dateString: string) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Header with refresh and mark all buttons */}
      <div className="flex gap-4 items-center pb-4 border-b border-utils-divider">
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
        <div className="flex-1 flex justify-end mr-4">
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
                        <div className="flex items-center gap-2 order-1 sm:order-2">
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
                      <p className="text-sm text-type-secondary mb-2 line-clamp-2">
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

  // Load read notifications from cookie
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

      const response = await fetch(NOTIFICATIONS_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
        !xmlText ||
        (!xmlText.includes("<rss") && !xmlText.includes("<feed"))
      ) {
        throw new Error("Invalid RSS feed format");
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Failed to parse RSS feed");
      }

      // Ensure we have a valid document
      if (!xmlDoc || !xmlDoc.documentElement) {
        throw new Error("Invalid XML document");
      }

      const items = xmlDoc.querySelectorAll("item");
      if (!items || items.length === 0) {
        throw new Error("No items found in RSS feed");
      }
      const parsedNotifications: NotificationItem[] = [];
      const autoReadGuids: string[] = [];

      // Mark notifications older than 14 days as read
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      items.forEach((item) => {
        try {
          const guid = item.querySelector("guid")?.textContent || "";
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const description =
            item.querySelector("description")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || "";
          const category = item.querySelector("category")?.textContent || "";

          // Skip items without essential data
          if (!guid || !title) {
            return;
          }

          // Parse the publication date
          const notificationDate = new Date(pubDate);

          // Include all notifications, but collect old ones to mark as read
          parsedNotifications.push({
            guid,
            title,
            link,
            description,
            pubDate,
            category,
          });

          // Collect GUIDs of notifications older than 14 days
          if (notificationDate <= fourteenDaysAgo) {
            autoReadGuids.push(guid);
          }
        } catch (itemError) {
          // Skip malformed items
          console.warn("Skipping malformed RSS item:", itemError);
        }
      });

      setNotifications(parsedNotifications);

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
  }, []);

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
        currentView === "list" ? "Notifications" : selectedNotification?.title
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
          openNotificationDetail={openNotificationDetail}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          formatDate={formatDate}
        />
      ) : selectedNotification ? (
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
        const response = await fetch(NOTIFICATIONS_ENDPOINT);
        if (!response.ok) return;

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = xmlDoc.querySelectorAll("item");
        const parsedNotifications: NotificationItem[] = [];

        items.forEach((item) => {
          const guid = item.querySelector("guid")?.textContent || "";
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const description =
            item.querySelector("description")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || "";
          const category = item.querySelector("category")?.textContent || "";

          parsedNotifications.push({
            guid,
            title,
            link,
            description,
            pubDate,
            category,
          });
        });

        setNotifications(parsedNotifications);
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
      if (!savedRead) return notifications.length; // Return total count if no read data

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
