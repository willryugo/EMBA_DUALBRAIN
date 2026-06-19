import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth";

// 입장 게이트 — 유효한 인증 쿠키가 없으면 /welcome 으로 리다이렉트.
// 17기 내부 공유 전용. 관리자(0604)·원우(2580) 둘 다 입장 가능(현재 역할별 UI 차이 없음 — 전원 동일).
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

// /welcome, 인증 API, Next 내부 자산, PWA(manifest·서비스워커), 정적 파일은 게이트에서 제외.
// ※ manifest.webmanifest·sw.js를 빼면 비번 게이트가 PWA 자산을 /welcome으로 리다이렉트해 설치가 안 됨.
export const config = {
  matcher: [
    "/((?!welcome|api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.png|icon.svg|apple-icon.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$).*)",
  ],
};
