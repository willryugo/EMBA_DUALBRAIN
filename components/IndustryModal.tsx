"use client";
import { useState } from "react";
import type { Industry } from "@/lib/types";
import { INDUSTRIES, UNIVERSAL } from "@/lib/manifest";
import { store } from "@/lib/storage";
import { DBMark } from "./DBMark";

interface Props {
  onClose: () => void;
}

// 첫 방문 시 산업 선택 모달. 개인 식별 없이 산업만 부착해 추천·로그 분석의 차원 확보.
export function IndustryModal({ onClose }: Props) {
  const [selected, setSelected] = useState<Industry | null>(null);

  const choices = INDUSTRIES.filter((i) => i !== UNIVERSAL);

  const save = (industries: Industry[]) => {
    store.set("emba17_my_industries", industries);
    onClose();
  };

  return (
    <div className="industry-modal-overlay">
      <div className="industry-modal">
        <div className="im-mark">
          <DBMark size={48} />
        </div>
        <div className="im-eyebrow">FIRST VISIT · 산업 선택</div>
        <h2 className="im-title">너의 산업은?</h2>
        <p className="im-deck">
          '내 산업만' 필터가 자동으로 켜지고, 추천이 더 정확해진다.
          <br />
          개인 정보는 안 받는다 — 산업만. 나중에 Tweaks에서 바꿀 수 있다.
        </p>
        <div className="im-chips">
          {choices.map((i) => (
            <button
              key={i}
              type="button"
              className={"im-chip " + (selected === i ? "on" : "")}
              onClick={() => setSelected(i)}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="im-actions">
          <button
            type="button"
            className="im-skip"
            onClick={() => save([])}
            title="나중에 Tweaks에서 선택할 수 있어요"
          >
            건너뛰기
          </button>
          <button
            type="button"
            className="im-save"
            disabled={!selected}
            onClick={() => selected && save([selected])}
          >
            저장하고 시작 →
          </button>
        </div>
      </div>
    </div>
  );
}
