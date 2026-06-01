"use client";
import { useState } from "react";
import type { Industry } from "@/lib/types";
import { INDUSTRIES, UNIVERSAL } from "@/lib/manifest";
import { store } from "@/lib/storage";
import { DBMark } from "./DBMark";

interface Props {
  onClose: () => void;
  /** 편집 모드 — Tweaks에서 다시 열 때. 기존 선택값을 미리 채움. */
  mode?: "first" | "edit";
  initial?: Industry[];
}

// 산업 선택 모달. 첫 방문 시 자동 + Tweaks에서 재편집 가능. 복수 선택 가능.
// 개인 식별 없이 산업만 부착해 추천·심화 진단·로그 분석의 차원 확보.
export function IndustryModal({ onClose, mode = "first", initial = [] }: Props) {
  const [selected, setSelected] = useState<Industry[]>(initial);
  const isEdit = mode === "edit";

  const choices = INDUSTRIES.filter((i) => i !== UNIVERSAL);

  const toggle = (i: Industry) =>
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const save = (industries: Industry[]) => {
    store.set("emba17_my_industries", industries);
    // 다른 컴포넌트 트리(DualBrainApp)도 즉시 반영 — GlobalGates/Tweaks와 분리돼 있어 이벤트로 동기화.
    try {
      window.dispatchEvent(
        new CustomEvent("emba17:industries-changed", { detail: industries })
      );
    } catch {
      /* 구형 환경 무시 */
    }
    onClose();
  };

  return (
    <div
      className="industry-modal-overlay"
      onClick={(e) => {
        if (
          isEdit &&
          (e.target as HTMLElement).classList.contains("industry-modal-overlay")
        )
          onClose();
      }}
    >
      <div className="industry-modal">
        <div className="im-mark">
          <DBMark size={48} />
        </div>
        <div className="im-eyebrow">
          {isEdit ? "내 산업 변경" : "FIRST VISIT · 산업 선택"}
        </div>
        <h2 className="im-title">어느 산업에 계신가요?</h2>
        <p className="im-deck">
          '내 산업만' 필터와 추천, 그리고 카드 심화 진단의 <b>산업별 처방</b>이 이
          값으로 맞춰집니다. <b>여러 개 골라도 됩니다.</b>
          <br />
          개인 정보는 받지 않습니다 — 산업만.
        </p>
        <div className="im-chips">
          {choices.map((i) => (
            <button
              key={i}
              type="button"
              className={"im-chip " + (selected.includes(i) ? "on" : "")}
              onClick={() => toggle(i)}
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
            title={isEdit ? "산업 설정 비우기" : "나중에 Tweaks에서 선택할 수 있어요"}
          >
            {isEdit ? "설정 안 함" : "건너뛰기"}
          </button>
          <button
            type="button"
            className="im-save"
            disabled={selected.length === 0}
            onClick={() => selected.length > 0 && save(selected)}
          >
            {selected.length > 1
              ? `${selected.length}개 선택 · ${isEdit ? "저장" : "시작"} →`
              : isEdit
                ? "저장 →"
                : "저장하고 시작 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
