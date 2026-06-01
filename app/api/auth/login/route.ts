import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  makeAuthToken,
  roleForPassword,
} from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid request" },
      { status: 400 }
    );
  }

  const role = roleForPassword(password);
  if (!role) {
    // 일정 지연으로 brute force 살짝 늦춤 (edge에서 충분치 않지만 작은 방어층)
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json(
      { ok: false, error: "비밀번호가 맞지 않습니다." },
      { status: 401 }
    );
  }

  const token = await makeAuthToken(role);
  // 역할은 민감정보가 아니라 클라이언트가 Tweaks 노출 판단에 쓴다(쿠키는 httpOnly라 JS가 못 읽음).
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
