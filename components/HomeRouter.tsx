"use client";
import { useEffect, useState } from "react";
import { DualBrainApp } from "./DualBrainApp";
import { MobileApp } from "./MobileApp";

// ≤720px → 모바일 리뉴얼(MobileApp), 그 외 → 데스크톱(DualBrainApp).
// 마운트 후에만 분기를 확정해 하이드레이션 불일치를 피한다(둘 다 client·localStorage 의존).
export function HomeRouter() {
  const [mode, setMode] = useState<"m" | "d" | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => setMode(mq.matches ? "m" : "d");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  if (mode === null)
    return <div style={{ minHeight: "100dvh", background: "var(--bg)" }} aria-hidden />;
  return mode === "m" ? <MobileApp /> : <DualBrainApp />;
}
