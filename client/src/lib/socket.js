import { io } from "socket.io-client";

const socketUrl = process.env.REACT_APP_SOCKET_URL ?? "http://localhost:5001";

export const socket = io(socketUrl, {
  autoConnect: true,
});
