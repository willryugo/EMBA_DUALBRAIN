"use client";
import { useState } from "react";
import type { TweakState, ThemeKey, FontKey, Density } from "@/lib/types";
import { THEMES, FONTS } from "@/lib/themes";

interface Props {
  open: boolean;
  onClose: () => void;
  state: TweakState;
  setState: <K extends keyof TweakState>(k: K, v: TweakState[K]) => void;
  onResetFilters: () => void;
  onClearSaved: () => void;
}

export function TweaksPanel({
  open,
  onClose,
  state,
  setState,
  onResetFilters,
  onClearSaved,
}: Props) {
  if (!open) return null;
  return (
    <div className="twk-panel">
      <div className="twk-hd">
        <b>듀얼브레인 톤</b>
        <button className="twk-x" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      <div className="twk-body">
        <div className="twk-sect">컬러 팔레트</div>
        <TweakSelect<ThemeKey>
          label="테마"
          value={state.theme}
          options={
            (Object.keys(THEMES) as ThemeKey[]).map((k) => ({
              value: k,
              label: THEMES[k].name,
            }))
          }
          onChange={(v) => setState("theme", v)}
        />
        <TweakColorChips
          themes={state.theme}
          onChange={(k) => setState("theme", k)}
        />

        <div className="twk-sect">타입 시스템</div>
        <TweakSelect<FontKey>
          label="폰트"
          value={state.font}
          options={
            (Object.keys(FONTS) as FontKey[]).map((k) => ({
              value: k,
              label: FONTS[k].name,
            }))
          }
          onChange={(v) => setState("font", v)}
        />

        <div className="twk-sect">레이아웃</div>
        <TweakToggle
          label="다크 인용 카드 사용"
          value={state.quoteCards}
          onChange={(v) => setState("quoteCards", v)}
        />
        <TweakRadio<Density>
          label="밀도"
          value={state.density}
          options={["compact", "regular", "airy"]}
          onChange={(v) => setState("density", v)}
        />

        <div className="twk-sect">유틸</div>
        <TweakButton label="필터 초기화" secondary onClick={onResetFilters} />
        <TweakButton
          label="저장된 솔루션 카드 비우기"
          secondary
          onClick={() => {
            if (confirm("저장된 솔루션 카드를 모두 비울게.")) {
              onClearSaved();
            }
          }}
        />
      </div>
    </div>
  );
}

interface SelectOpt<V extends string> {
  value: V;
  label: string;
}

function TweakSelect<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: SelectOpt<V>[];
  onChange: (v: V) => void;
}) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <select
        className="twk-field"
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TweakToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? "1" : "0"}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}

function TweakRadio<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: V[];
  onChange: (v: V) => void;
}) {
  const idx = Math.max(0, options.indexOf(value));
  const n = options.length;
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <div className="twk-seg" role="radiogroup">
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function TweakButton({
  label,
  onClick,
  secondary = false,
}: {
  label: string;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      className={secondary ? "twk-btn secondary" : "twk-btn"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TweakColorChips({
  themes,
  onChange,
}: {
  themes: ThemeKey;
  onChange: (k: ThemeKey) => void;
}) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>팔레트 미리보기</span>
      </div>
      <div className="twk-chips" role="radiogroup">
        {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
          const t = THEMES[k];
          const on = themes === k;
          return (
            <button
              key={k}
              type="button"
              className="twk-chip"
              role="radio"
              aria-checked={on}
              data-on={on ? "1" : "0"}
              title={t.name}
              style={{ background: t.brainL }}
              onClick={() => onChange(k)}
            >
              <span>
                <i style={{ background: t.brainR }} />
                <i style={{ background: t.bg }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
