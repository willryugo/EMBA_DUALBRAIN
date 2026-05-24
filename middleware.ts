import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth";

// 비인증 통과 경로
const PUBLIC_PREFIXES = ["/welcome", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/welcome";
  if (pathname !== "/") url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

// 정적 자산·_next 내부 경로는 매칭 제외
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|dualbrain-logo.png).*)"],
};
