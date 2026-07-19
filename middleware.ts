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
// ※ magazine은 예전엔 여기서 제외해 비번 없이 열렸다. 이제 게이트 안으로 들인다 —
//    매거진에 조별과제 드라이브 링크(링크가 있는 모든 사용자 = 인터넷 전체)가 실려 있어,
//    페이지가 공개면 링크를 아는 누구나 51개 과제 파일에 닿는다. 게이트가 그 링크를 가려 준다.
//    /magazine 과 rewrite 대상인 /magazine.html 둘 다 막아야 우회가 안 된다.
export const config = {
  matcher: [
    // ※ magazine.webmanifest 도 제외 — 매거진을 게이트에 넣으면서 같이 막혀 307이 났다.
    //    매니페스트가 안 열리면 '홈 화면에 추가'가 앱 이름·아이콘·standalone 을 못 읽어
    //    그냥 북마크로 떨어진다. 매니페스트엔 비밀이 없으니 열어 둔다.
    "/((?!welcome|api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|magazine.webmanifest|sw.js|icon.png|icon.svg|apple-icon.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$).*)",
  ],
};
