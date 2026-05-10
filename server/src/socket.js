import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { corsOrigin } from "./config/cors.js";
import { setIo } from "./socketState.js";
import { env } from "./config/env.js";

export function setupSocket(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  setIo(io);

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    if (token && env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const userId = String(decoded.sub ?? decoded.id ?? "");
        if (userId) socket.join(`user:${userId}`);
      } catch {
        // Anonymous sockets can still receive public realtime events.
      }
    }

    io.emit("active_sessions", io.engine.clientsCount);

    socket.on("disconnect", () => {
      io.emit("active_sessions", io.engine.clientsCount);
    });
  });
}
