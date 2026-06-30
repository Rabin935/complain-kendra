import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server as SocketServer } from "socket.io";
import { SUBJECT_TYPES, USER_ROLES, type JwtUserPayload, type UserRole } from "../types";

let io: SocketServer | null = null;

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in the environment.");
  }

  return jwtSecret;
}

function isJwtUserPayload(payload: string | jwt.JwtPayload): payload is JwtUserPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.userId === "string" &&
    typeof payload.email === "string" &&
    USER_ROLES.includes(payload.role as UserRole) &&
    SUBJECT_TYPES.includes(payload.type as JwtUserPayload["type"])
  );
}

export function initializeRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth.token === "string"
          ? socket.handshake.auth.token
          : undefined;

      if (!token) {
        next(new Error("Realtime authentication is required."));
        return;
      }

      const decoded = jwt.verify(token, getJwtSecret());

      if (!isJwtUserPayload(decoded)) {
        next(new Error("Invalid realtime token."));
        return;
      }

      socket.data.user = {
        ...decoded,
        subjectId: decoded.subjectId ?? decoded.userId,
      };
      next();
    } catch {
      next(new Error("Invalid or expired realtime token."));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as JwtUserPayload;
    socket.join(`user:${user.subjectId}`);

    if (user.type === "officer") {
      socket.join("officers");
    }

    socket.on("join:ward", (wardId: string) => {
      if (wardId) {
        socket.join(`ward:${wardId}`);
      }
    });

    socket.on("join:officers", () => {
      if (user.type === "officer") {
        socket.join("officers");
      }
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
  const officerId = typeof payload.officerId === "string" ? payload.officerId : undefined;
  const wardId = typeof payload.wardId === "string" ? payload.wardId : undefined;

  if (userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }

  if (officerId) {
    io.to(`user:${officerId}`).emit(event, payload);
  }

  if (wardId) {
    io.to(`ward:${wardId}`).emit(event, payload);
  }

  if (complaintId) {
    io.to(`complaint:${complaintId}`).emit(event, payload);
  }

  if (event.startsWith("officer:") || event.startsWith("complaint:")) {
    io.to("officers").emit(event, payload);
  }
}
