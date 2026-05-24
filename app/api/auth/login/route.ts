import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  makeAuthToken,
  verifyPassword,
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

  if (!password || !verifyPassword(password)) {
    // 일정 지연으로 brute force 살짝 늦춤 (edge에서 충분치 않지만 작은 방어층)
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json(
      { ok: false, error: "비밀번호가 맞지 않습니다." },
      { status: 401 }
    );
  }

  const token = await makeAuthToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
