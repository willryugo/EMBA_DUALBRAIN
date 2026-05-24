"use client";
import { useState } from "react";

const WIDTHS = [375, 390, 430, 360] as const;

export default function MobilePreview() {
  const [w, setW] = useState<(typeof WIDTHS)[number]>(390);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        gap: 16,
        fontFamily: "var(--mono, ui-monospace, monospace)",
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {WIDTHS.map((width) => (
          <button
            key={width}
            onClick={() => setW(width)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              border:
                w === width
                  ? "1.5px solid #fafafa"
                  : "1px solid rgba(250,250,250,.3)",
              background: w === width ? "#fafafa" : "transparent",
              color: w === width ? "#1a1a1a" : "#fafafa",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            {width}px
          </button>
        ))}
        <a
          href="/"
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid rgba(250,250,250,.3)",
            background: "transparent",
            color: "#fafafa",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          ← 데스크탑
        </a>
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: ".05em" }}>
        iPhone {w === 390 ? "14 Pro" : w === 430 ? "14 Pro Max" : "viewport"} ·{" "}
        {w}×844
      </div>
      <iframe
        src="/"
        title="DualBrain mobile preview"
        style={{
          width: w,
          height: 844,
          border: "1px solid rgba(250,250,250,.2)",
          borderRadius: 24,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,.4)",
        }}
      />
    </div>
  );
}
