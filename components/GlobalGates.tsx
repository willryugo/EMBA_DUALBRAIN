"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { store } from "@/lib/storage";
import { IndustryModal } from "./IndustryModal";

// /welcome 외 모든 페이지에 한 번 마운트. 산업 미선택이면 모달 표시.
export function GlobalGates() {
  const pathname = usePathname();
  const [showIndustry, setShowIndustry] = useState(false);

  useEffect(() => {
    if (pathname === "/welcome") return;
    // null = 한 번도 응답한 적 없음. [] = 명시적으로 건너뛴 상태도 응답으로 침.
    const existing = store.get("emba17_my_industries");
    if (existing === null) setShowIndustry(true);
  }, [pathname]);

  if (pathname === "/welcome") return null;
  if (!showIndustry) return null;
  return <IndustryModal onClose={() => setShowIndustry(false)} />;
}
