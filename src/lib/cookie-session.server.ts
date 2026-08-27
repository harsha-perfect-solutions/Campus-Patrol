import { createRequire } from "module";

const isBrowser = typeof window !== "undefined";
const nodeRequire = !isBrowser ? createRequire(import.meta.url) : null;

export function getCookieServer(name: string): string | undefined {
  if (isBrowser) {
    try {
      const match = document.cookie.match(
        new RegExp("(?:^|; )" + (name || "").replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
      );
      return match ? decodeURIComponent(match[1] || "") : undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const { getCookie } = nodeRequire!("@tanstack/react-start/server");
    return getCookie(name);
  } catch {
    return undefined;
  }
}

export function setCookieServer(name: string, value: string, opts?: any): void {
  if (isBrowser) {
    try {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=86400`;
    } catch {
      // ignore
    }
    return;
  }
  try {
    const { setCookie } = nodeRequire!("@tanstack/react-start/server");
    setCookie(name, value, opts);
  } catch {
    // Ignored outside HTTP server request context
  }
}

export function deleteCookieServer(name: string, opts?: any): void {
  if (isBrowser) {
    try {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch {
      // ignore
    }
    return;
  }
  try {
    const { deleteCookie } = nodeRequire!("@tanstack/react-start/server");
    deleteCookie(name, opts);
  } catch {
    // Ignored outside HTTP server request context
  }
}

const cookieSessionServer = { getCookieServer, setCookieServer, deleteCookieServer };
export default cookieSessionServer;
