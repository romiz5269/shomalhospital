"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL, getToken } from "./api";

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function useStaffRealtime(onEvent: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const s = getSocket();
    if (!s) return;

    s.connect();
    s.emit("join:staff", token);

    const handler = (event: string) => (data: unknown) => {
      callbackRef.current(event, data);
    };

    const events = ["ticket:created", "ticket:updated", "ticket:reply", "ticket:deleted"] as const;
    const handlers = events.map((e) => {
      const h = handler(e);
      s.on(e, h);
      return { e, h };
    });

    return () => {
      handlers.forEach(({ e, h }) => s.off(e, h));
    };
  }, []);
}

export function useTicketRoom(ticketId: string | null, onEvent: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const token = getToken();
    if (!token || !ticketId) return;

    const s = getSocket();
    if (!s) return;

    if (!s.connected) s.connect();
    s.emit("join:ticket", { ticketId, token, role: "staff" });

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
