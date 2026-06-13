"use client";
import { useEffect } from "react";

// 서비스워커 등록 — 프로덕션에서만(dev는 SW 캐시가 HMR을 방해).
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}
