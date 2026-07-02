import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@/lib/supabase";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/access-denied"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response: sessionResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return sessionResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ロール・有効状態は変更が即座に反映される必要がある(無効化・降格対応)ため、
  // JWTにキャッシュせず毎リクエストDBを参照する。社内ツール規模の想定ユーザー数では許容範囲。
  const supabase = createServerClient();
  const { data: appUser } = await supabase
    .from("users")
    .select("id, role, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!appUser || appUser.status !== "active") {
    const url = request.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && appUser.role !== "admin" && appUser.role !== "manager") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-user-id", appUser.id);
  requestHeaders.set("x-app-user-role", appUser.role);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
