import { useEffect, useState } from "react";

import { useOverlayStack } from "@/stores/interface/overlayStack";

import { NotificationItem } from "../types";
import { fetchRssFeed, getAllFeeds, getSourceName } from "../utils";

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
            const xmlText = await fetchRssFeed(feedUrl);

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
