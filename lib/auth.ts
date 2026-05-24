// 단일 비밀번호 + httpOnly 쿠키 인증 — Edge Runtime 호환 (Web Crypto API 사용)
// 비밀번호는 학술국이 17기에게 공유. 개인 식별 X. 외부 노출만 차단.

export const COOKIE_NAME = "db_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90일

// 로컬 개발 fallback. 프로덕션은 Vercel 환경변수 DB_PASSWORD 필수.
const DEFAULT_PASSWORD = "dualbrain17";

export function getServerPassword(): string {
  return process.env.DB_PASSWORD || DEFAULT_PASSWORD;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 비밀번호를 SHA-256으로 해시한 값을 쿠키로 사용 — httpOnly라 JS에서 접근 불가.
export async function makeAuthToken(password: string): Promise<string> {
  return sha256Hex("dualbrain:" + password);
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await makeAuthToken(getServerPassword());
  return token === expected;
}

export function verifyPassword(input: string): boolean {
  return input === getServerPassword();
}
