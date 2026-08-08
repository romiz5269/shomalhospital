import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isConsolePath(pathname: string) {
  return /\/(fa|en)\/console(\/|$)/.test(pathname);
}

function isCmsPath(pathname: string) {
  return /\/(fa|en)\/admin(\/|$)/.test(pathname);
}

function redirectPort(req: NextRequest, port: string, pathname?: string) {
  const url = req.nextUrl.clone();
  url.port = port;
  url.protocol = "http:";
  url.hostname = "localhost";
  if (pathname) url.pathname = pathname;
  return NextResponse.redirect(url);
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const port = host.includes(":") ? host.split(":").pop() || "" : "";

  const onConsole = isConsolePath(pathname);
  const onCms = isCmsPath(pathname);
  const onPanel = onConsole || onCms;

  // Public site
  if (port === "4000") {
    if (onConsole) return redirectPort(req, "2000");
    if (onCms) return redirectPort(req, "3000");
  }

  // System admin port
  if (port === "2000") {
    if (onCms) return redirectPort(req, "3000");
    if (pathname === "/" || pathname === "/fa" || pathname === "/en") {
      return redirectPort(req, "2000", pathname === "/en" ? "/en/console" : "/fa/console");
    }
  }

  // CMS port
  if (port === "3000") {
    if (onConsole) return redirectPort(req, "2000");
    if (pathname === "/" || pathname === "/fa" || pathname === "/en") {
      return redirectPort(req, "3000", pathname === "/en" ? "/en/admin" : "/fa/admin");
    }
  }

  const res = intlMiddleware(req);
  if (onPanel) {
    res.headers.set("x-shomal-panel", "1");
  }
  return res;
}

export const config = {
  matcher: ["/", "/(fa|en)/:path*"],
};
