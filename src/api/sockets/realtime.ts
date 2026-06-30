import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function initializeRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:user", (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("join:officers", () => {
      socket.join("officers");
    });

    socket.on("join:complaint", (complaintId: string) => {
      if (complaintId) {
        socket.join(`complaint:${complaintId}`);
      }
    });
  });

  return io;
}

export function emitRealtimeEvent(event: string, payload: Record<string, unknown>): void {
  if (!io) {
    return;
  }

  io.emit(event, payload);

  const userId = typeof payload.userId === "string" ? payload.userId : undefined;
  const complaintId = typeof payload.complaintId === "string" ? payload.complaintId : undefined;

  if (userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }

  if (complaintId) {
    io.to(`complaint:${complaintId}`).emit(event, payload);
  }

  if (event.startsWith("officer:") || event.startsWith("complaint:")) {
    io.to("officers").emit(event, payload);
  }
}
