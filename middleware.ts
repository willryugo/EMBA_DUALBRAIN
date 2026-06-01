import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth";

// 입장 게이트 — 유효한 인증 쿠키가 없으면 /welcome 으로 리다이렉트.
// 17기 내부 공유 전용. 관리자(0604)·원우(2580) 둘 다 입장 가능, 역할 구분은 클라이언트(Tweaks 노출)에서.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  const redirect = url.pathname + url.search;
  url.pathname = "/welcome";
  url.search = redirect && redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : "";
  return NextResponse.redirect(url);
}

// /welcome, 인증 API, Next 내부 자산, 정적 파일은 게이트에서 제외.
export const config = {
  matcher: [
    "/((?!welcome|api/auth|_next/static|_next/image|favicon.ico|icon.png|icon.svg|apple-icon.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$).*)",
  ],
};
