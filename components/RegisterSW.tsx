"use client";
import { useEffect } from "react";

// 서비스워커 등록 — 프로덕션에서만(dev는 SW 캐시가 HMR을 방해).
// 새 SW가 활성화되어 기존 SW를 '교체'하면 1회 새로고침해 깨끗한(네트워크) 셸로 전환한다.
// ⚠️ 첫 설치(이전 컨트롤러 없음)에는 새로고침하지 않는다 — 불필요한 리로드/루프 방지.
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const onControllerChange = () => {
      // 기존 SW가 있던 페이지가 '업데이트'로 새 SW에 넘어갈 때만 1회 새로고침.
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((r) => r.update())
        .catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);
  return null;
}
