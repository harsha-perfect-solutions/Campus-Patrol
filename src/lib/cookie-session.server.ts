import { getCookie, setCookie, deleteCookie, getRequestHeader } from "@tanstack/react-start/server";

export async function getCookieServer(name: string): Promise<string | undefined> {
  if (typeof window !== "undefined") {
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
    const val = getCookie(name);
    if (val) return val;
  } catch {}

  try {
    const rawCookie = getRequestHeader("cookie");
    if (rawCookie) {
      const match = rawCookie.match(
        new RegExp("(?:^|; )" + (name || "").replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
      );
      if (match) return decodeURIComponent(match[1] || "");
    }
  } catch {}

  return undefined;
}

export async function setCookieServer(name: string, value: string, opts?: any): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=86400`;
    } catch {
      // ignore
    }
    return;
  }
  try {
    setCookie(name, value, opts);
  } catch (err) {
    console.warn("[Cookie Error] setCookieServer failed:", err);
  }
}

export async function deleteCookieServer(name: string, opts?: any): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch {
      // ignore
    }
    return;
  }
  try {
    deleteCookie(name, opts);
  } catch (err) {
    console.warn("[Cookie Error] deleteCookieServer failed:", err);
  }
}

const cookieSessionServer = { getCookieServer, setCookieServer, deleteCookieServer };
export default cookieSessionServer;
