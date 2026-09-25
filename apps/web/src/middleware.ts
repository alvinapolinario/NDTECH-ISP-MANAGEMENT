import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withBasePath } from "@/lib/base-path";

const PUBLIC_PATHS = ["/login", "/backend"];

function stripTrailingSlash(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const pathname = stripTrailingSlash(request.nextUrl.pathname);
  const token = request.cookies.get("isp_access_token")?.value;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL(withBasePath("/"), request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL(withBasePath("/login"), request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
