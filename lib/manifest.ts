import manifestJson from "@/data/manifest.json";
import type { Course, Domain, Industry } from "./types";

export const COURSES = manifestJson.courses as Course[];
export const COURSE_SHORT = manifestJson.course_short as Record<Course, string>;
export const COURSE_COLOR = manifestJson.course_color as Record<Course, string>;
export const DOMAINS = manifestJson.domains as Domain[];
export const INDUSTRIES = manifestJson.industries as Industry[];
export const UNIVERSAL = manifestJson.universal as Industry;

// 사용자 산업 프로파일 기본값 — '내 산업' 설정에서 직접 선택할 때까지 빈 배열.
// Phase 3에서 OAuth 가입 시 입력받아 영구화 예정.
export const MY_INDUSTRIES_DEFAULT: Industry[] = [];
