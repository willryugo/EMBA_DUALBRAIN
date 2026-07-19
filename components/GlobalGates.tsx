"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initEventLogging } from "@/lib/events";

// 예전엔 여기서 '내 산업 선택' 모달(IndustryModal)을 띄웠다. 그건 이제 없는 메인 앱의 온보딩이었고,
// 지금은 루트가 /magazine 으로 넘어가는 찰나에 잠깐 떴다 사라져 깜빡임만 남겼다(시크릿 모드에서 재현).
// 매거진은 산업 정보를 쓰지 않으므로 모달을 완전히 걷어낸다. 이벤트 로깅 초기화만 남긴다.
export function GlobalGates() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/welcome") return;
    initEventLogging();
  }, [pathname]);

  return null;
}
