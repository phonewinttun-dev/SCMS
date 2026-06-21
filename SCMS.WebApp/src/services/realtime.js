import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./api";

const apiRoot = API_BASE_URL.replace(/\/api$/i, "");

const getToken = () => localStorage.getItem("scms_token") || localStorage.getItem("token") || "";

export const createHubConnection = (hubPath) =>
  new signalR.HubConnectionBuilder()
    .withUrl(`${apiRoot}${hubPath}`, {
      accessTokenFactory: getToken,
    })
    .withAutomaticReconnect()
    .build();

export const createQueueConnection = () => createHubConnection("/hubs/queue");

export const createNotificationsConnection = () => createHubConnection("/hubs/notifications");
