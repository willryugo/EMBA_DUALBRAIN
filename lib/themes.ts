import type { ThemeKey, FontKey } from "./types";

export interface Theme {
  name: string;
  bg: string;
  paper: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
  accentSoft: string;
  brainL: string;
  brainR: string;
  bgImage: string;
}

export interface FontPair {
  name: string;
  serif: string;
  sans: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  duotone: {
    name: "듀얼 · Soft Venn",
    bg: "#FAFBFD", paper: "#FFFFFF", ink: "#15131A",
    inkSoft: "#3A3A45", inkFaint: "#8F8E98",
    accent: "#5B7FB0", accentSoft: "#D8E2EE",
    brainL: "#5B7FB0", brainR: "#C28FB0",
    bgImage: "radial-gradient(60% 70% at 100% 0%, rgba(194,143,176,.28) 0%, transparent 55%), radial-gradient(60% 70% at 0% 0%, rgba(91,127,176,.22) 0%, transparent 55%)",
  },
  white: {
    name: "순백 · Pure",
    bg: "#FFFFFF", paper: "#FFFFFF", ink: "#0B0B0E",
    inkSoft: "#3A3A40", inkFaint: "#8C8C90",
    accent: "#0B0B0E", accentSoft: "#D0D0D2",
    brainL: "#2D6FB0", brainR: "#C28FB0",
    bgImage: "none",
  },
  papergrey: {
    name: "용지 · Cool Grey",
    bg: "#EEEEF1", paper: "#FAFAFC", ink: "#0F1117",
    inkSoft: "#3C3D45", inkFaint: "#8A8A92",
    accent: "#2E5894", accentSoft: "#C4D3E5",
    brainL: "#2E5894", brainR: "#A04880",
    bgImage: "none",
  },
  newspaper: {
    name: "신문 · Navy",
    bg: "#E9E4D4", paper: "#FAF6E8", ink: "#0F1117",
    inkSoft: "#3C3D45", inkFaint: "#8A8A82",
    accent: "#1F3A68", accentSoft: "#B9C9DF",
    brainL: "#1F3A68", brainR: "#8C2A3E",
    bgImage: "none",
  },
  sage: {
    name: "사색 · Forest",
    bg: "#EBE7D7", paper: "#F8F5E8", ink: "#1A1F1A",
    inkSoft: "#3F463C", inkFaint: "#8E9282",
    accent: "#3B5C3B", accentSoft: "#BFCFB8",
    brainL: "#3B5C3B", brainR: "#A04A30",
    bgImage: "none",
  },
  bauhaus: {
    name: "바우하우스 · Red",
    bg: "#F2EFE4", paper: "#FFFFFF", ink: "#0A0A0A",
    inkSoft: "#3A3A3A", inkFaint: "#8C8C8C",
    accent: "#C8331E", accentSoft: "#F0BFB5",
    brainL: "#1D3557", brainR: "#C8331E",
    bgImage: "none",
  },
  midnight: {
    name: "심야 · Indigo",
    bg: "#E3E1D7", paper: "#F5F3EB", ink: "#15131C",
    inkSoft: "#3A3742", inkFaint: "#86838E",
    accent: "#2E2A6E", accentSoft: "#BFBCDB",
    brainL: "#2E2A6E", brainR: "#8E2E5E",
    bgImage: "none",
  },
  claudewarm: {
    name: "온도 · Cream (claude)",
    bg: "#F3EEE2", paper: "#FFFCF6", ink: "#16150F",
    inkSoft: "#4A4840", inkFaint: "#928F81",
    accent: "#C24A28", accentSoft: "#E8C3B4",
    brainL: "#2D6FB0", brainR: "#C24A28",
    bgImage: "none",
  },
  monochrome: {
    name: "흑백 · Mono",
    bg: "#EEEDE7", paper: "#FAFAF6", ink: "#0A0A0A",
    inkSoft: "#3A3A3A", inkFaint: "#909088",
    accent: "#0A0A0A", accentSoft: "#C8C8C2",
    brainL: "#0A0A0A", brainR: "#5C5C58",
    bgImage: "none",
  },
  dawn: {
    name: "여명 · Dawn",
    bg: "#FBF6F4", paper: "#FFFFFF", ink: "#1A1418",
    inkSoft: "#403640", inkFaint: "#90858F",
    accent: "#775381", accentSoft: "#E8C8DC",
    brainL: "#8C96BF", brainR: "#D1809E",
    bgImage: "radial-gradient(80% 60% at 100% 0%, rgba(209,128,158,.18) 0%, transparent 55%), radial-gradient(60% 60% at 0% 100%, rgba(140,150,191,.16) 0%, transparent 55%)",
  },
  mist: {
    name: "안개 · Mist",
    bg: "#F0F2F0", paper: "#FFFFFF", ink: "#0F1414",
    inkSoft: "#3A4040", inkFaint: "#8A9090",
    accent: "#3E6E68", accentSoft: "#B8D4D0",
    brainL: "#3E6E68", brainR: "#7E6E94",
    bgImage: "radial-gradient(70% 70% at 50% 0%, rgba(126,110,148,.10) 0%, transparent 60%)",
  },
};

export const FONTS: Record<FontKey, FontPair> = {
  editorial: {
    name: "에디토리얼",
    serif: '"Noto Serif KR",ui-serif,serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
  classic: {
    name: "정통 명조",
    serif: '"Nanum Myeongjo",ui-serif,serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
  modern: {
    name: "모던 바탕",
    serif: '"Gowun Batang",ui-serif,serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
  display: {
    name: "디스플레이 (블랙한산스)",
    serif: '"Black Han Sans",ui-serif,sans-serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
  cormorant: {
    name: "코모란트 + 한글",
    serif: '"Cormorant Garamond","Noto Serif KR",ui-serif,serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
  allsans: {
    name: "올 산세리프",
    serif: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
    sans: '"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif',
  },
};

function hexToRgb(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "0,0,0";
  return m.map((x) => parseInt(x, 16)).join(",");
}

export function applyTheme(themeKey: ThemeKey) {
  if (typeof document === "undefined") return;
  const t = THEMES[themeKey] || THEMES.dawn;
  const r = document.documentElement;
  r.style.setProperty("--bg", t.bg);
  r.style.setProperty("--paper", t.paper);
  r.style.setProperty("--ink", t.ink);
  r.style.setProperty("--ink-soft", t.inkSoft);
  r.style.setProperty("--ink-faint", t.inkFaint);
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--accent-soft", t.accentSoft);
  r.style.setProperty("--brain-l", t.brainL);
  r.style.setProperty("--brain-r", t.brainR);
  r.style.setProperty("--bg-image", t.bgImage || "none");
  const inkRgb = hexToRgb(t.ink);
  r.style.setProperty("--line", `rgba(${inkRgb},.10)`);
  r.style.setProperty("--line-2", `rgba(${inkRgb},.22)`);
  r.style.setProperty("--line-3", `rgba(${inkRgb},.55)`);
}

export function applyFont(fontKey: FontKey) {
  if (typeof document === "undefined") return;
  const f = FONTS[fontKey] || FONTS.classic;
  const r = document.documentElement;
  r.style.setProperty("--serif", f.serif);
  r.style.setProperty("--sans", f.sans);
}
