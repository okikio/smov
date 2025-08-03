const DEFAULT_FEEDS = ["/notifications.xml"];
// const CORS_PROXY = "http://api.allorigins.win/get?url="; // temporarily disabled

export const getAllFeeds = (): string[] => {
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

export const getFetchUrl = (feedUrl: string): string => {
  if (feedUrl.startsWith("/")) {
    return feedUrl;
  }
  return feedUrl; //  return `${CORS_PROXY}${encodeURIComponent(feedUrl)}`;
};

export const getSourceName = (feedUrl: string): string => {
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

export const formatDate = (dateString: string) => {
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

export const getCategoryColor = (category: string) => {
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

export const getCategoryLabel = (category: string) => {
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
