"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { store } from "@/lib/storage";
import { initEventLogging } from "@/lib/events";
import { IndustryModal } from "./IndustryModal";

// /welcome 외 모든 페이지에 한 번 마운트. 산업 미선택이면 모달 표시 + 이벤트 로깅 초기화.
export function GlobalGates() {
  const pathname = usePathname();
  const [showIndustry, setShowIndustry] = useState(false);

  useEffect(() => {
    if (pathname === "/welcome") return;
    initEventLogging();
    // null = 한 번도 응답한 적 없음. [] = 명시적으로 건너뛴 상태도 응답으로 침.
    const existing = store.get("emba17_my_industries");
    if (existing === null) setShowIndustry(true);
    // 모바일 Hero의 '내 산업' 칩 등에서 산업 모달을 다시 열 수 있게.
    const onOpen = () => setShowIndustry(true);
    window.addEventListener("emba17:open-industry", onOpen);
    return () => window.removeEventListener("emba17:open-industry", onOpen);
  }, [pathname]);

  if (pathname === "/welcome") return null;
  if (!showIndustry) return null;
  return <IndustryModal onClose={() => setShowIndustry(false)} />;
}
