// 2단계 비밀번호 + httpOnly 쿠키 인증 — Edge Runtime 호환 (Web Crypto API 사용)
// 관리자(국장·부국장)와 일반 원우를 별도 비밀번호로 구분. 둘 다 입장 가능,
// 관리자만 Tweaks(테마 변경)가 보인다. 개인 식별 X — 외부 노출 차단 + 역할 분리.

export const COOKIE_NAME = "db_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90일

export type Role = "admin" | "member";

// 비밀번호 — 17기 학술국이 공유. 환경변수로 덮어쓸 수 있음(Vercel: DB_ADMIN_PASSWORD / DB_MEMBER_PASSWORD).
// 내부 공유용 캐주얼 게이트라 코드 기본값을 둔다(민감자료 아님). 운영에서 바꾸려면 env만 설정.
function adminPassword(): string {
  return process.env.DB_ADMIN_PASSWORD || "0604";
}
function memberPassword(): string {
  return process.env.DB_MEMBER_PASSWORD || "2580";
}

// 입력 비밀번호 → 역할. 매칭 없으면 null.
export function roleForPassword(input: string): Role | null {
  const p = input.trim();
  if (!p) return null;
  if (p === adminPassword()) return "admin";
  if (p === memberPassword()) return "member";
  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 역할별 토큰 — httpOnly 쿠키 값. 해당 역할의 비밀번호를 모르면 위조 불가.
export async function makeAuthToken(role: Role): Promise<string> {
  const secret = role === "admin" ? adminPassword() : memberPassword();
  return sha256Hex("dualbrain:v2:" + role + ":" + secret);
}

// 쿠키 토큰 → 역할. 유효하지 않으면 null. (middleware·서버에서 입장/역할 판정)
export async function roleForToken(
  token: string | undefined
): Promise<Role | null> {
  if (!token) return null;
  if (token === (await makeAuthToken("admin"))) return "admin";
  if (token === (await makeAuthToken("member"))) return "member";
  return null;
}

// 입장 가능 여부(역할 무관).
export async function isValidToken(
  token: string | undefined
): Promise<boolean> {
  return (await roleForToken(token)) !== null;
}
