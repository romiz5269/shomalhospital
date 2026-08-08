"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function useAdminRealtime(onEvent: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const s = getSocket();
    if (!s) return;

    s.connect();
    s.emit("join:admin", token);

    const events = ["ticket:created", "ticket:updated", "ticket:reply", "ticket:deleted"] as const;
    const handlers = events.map((e) => {
      const h = (data: unknown) => callbackRef.current(e, data);
      s.on(e, h);
      return { e, h };
    });

    return () => {
      handlers.forEach(({ e, h }) => s.off(e, h));
    };
  }, []);
}

export function useAdminTicketRoom(ticketId: string | null, onEvent: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token || !ticketId) return;

    const s = getSocket();
    if (!s) return;

    if (!s.connected) s.connect();
    s.emit("join:ticket", { ticketId, token, role: "admin" });

    const events = ["ticket:updated", "ticket:reply", "ticket:deleted"] as const;
    const handlers = events.map((e) => {
      const h = (data: unknown) => callbackRef.current(e, data);
      s.on(e, h);
      return { e, h };
    });

    return () => {
      handlers.forEach(({ e, h }) => s.off(e, h));
    };
  }, [ticketId]);
}
