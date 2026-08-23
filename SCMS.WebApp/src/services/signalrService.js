import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";
import { API_BASE_URL } from "./api";

const getHubUrl = (hubPath) => {
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  const cleanPath = hubPath.startsWith("/") ? hubPath : `/${hubPath}`;
  return `${host}${cleanPath}`;
};

/**
 * Creates and starts a real-time SignalR connection for the Notifications Hub.
 * 
 * @param {Object} handlers
 * @param {Function} handlers.onReceiveNotification - Called when a new notification arrives in real time
 * @param {Function} handlers.onNotificationsChanged - Called when notifications change
 * @returns {{ connection: import("@microsoft/signalr").HubConnection, stop: () => Promise<void> }}
 */
export const startNotificationsHub = ({
  onReceiveNotification,
  onNotificationsChanged,
} = {}) => {
  const token = localStorage.getItem("scms_token") || localStorage.getItem("token");
  if (!token) {
    return { connection: null, stop: async () => {} };
  }

  const hubUrl = getHubUrl("/hubs/notifications");

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => localStorage.getItem("scms_token") || localStorage.getItem("token") || "",
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();

  if (onReceiveNotification) {
    connection.on("ReceiveNotification", (notification) => {
      try {
        onReceiveNotification(notification);
      } catch (err) {
        console.error("Error in onReceiveNotification callback:", err);
      }
    });
  }

  if (onNotificationsChanged) {
    connection.on("NotificationsChanged", () => {
      try {
        onNotificationsChanged();
      } catch (err) {
        console.error("Error in onNotificationsChanged callback:", err);
      }
    });
  }

  let isStarted = false;

  const start = async () => {
    try {
      await connection.start();
      isStarted = true;
    } catch (err) {
      console.debug("SignalR connection notice:", err?.message || err);
    }
  };

  start();

  const stop = async () => {
    try {
      if (isStarted) {
        await connection.stop();
      }
    } catch (err) {
      console.debug("SignalR stop notice:", err);
    }
  };

  return { connection, stop };
};
