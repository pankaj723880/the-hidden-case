import { io } from "socket.io-client";

const socketUrl = process.env.REACT_APP_SOCKET_URL ?? "https://the-hidden-case.onrender.com";

export const socket = io(socketUrl, {
  autoConnect: true,
});
