// 단일 비밀번호 + httpOnly 쿠키 입장 게이트 — Edge Runtime 호환(Web Crypto).
// 17기 내부 공유 전용. (관리자/원우 2단계 폐지 → 전원 동일 UI)
export const COOKIE_NAME = "db_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90일

// 공유 비밀번호. 운영에서 바꾸려면 env(DB_PASSWORD) 설정. (내부 캐주얼 게이트)
function gatePassword(): string {
  return process.env.DB_PASSWORD || process.env.DB_MEMBER_PASSWORD || "2580";
}

export function isPassword(input: string): boolean {
  const p = input.trim();
  return p.length > 0 && p === gatePassword();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 쿠키 토큰. 기존 원우(member) 쿠키와 호환되도록 동일 스킴 유지 →
// 이미 2580으로 입장한 사람은 재로그인 불필요. (관리자 0604 쿠키만 무효)
export async function makeAuthToken(): Promise<string> {
  return sha256Hex("dualbrain:v2:member:" + gatePassword());
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await makeAuthToken());
}
