// 카드 임베딩 사전계산 (오프라인·빌드타임 1회) — 런타임 API 없음.
// 브라우저(lib/semanticSearch.ts)와 '동일 모델'을 써야 질문↔카드 벡터가 비교 가능.
// 실행: node scripts/embed-cards.mjs
import { pipeline, env } from "@xenova/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export const MODEL_ID = "Xenova/multilingual-e5-small";

env.allowLocalModels = false; // HF 허브에서 받기

function strip(s) {
  return String(s || "").replace(/\*/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

const cards = JSON.parse(readFileSync(join(ROOT, "data/cards.json"), "utf-8"));
const aliases = JSON.parse(readFileSync(join(ROOT, "data/aliases.json"), "utf-8"));

function passage(c) {
  const al = Array.isArray(aliases[c.id]) ? aliases[c.id].join(" ") : "";
  // 검색 신호가 강한 필드 위주로 합성 (제목·개념·요지·적용 + 별칭)
  return [
    strip(c.hook),
    strip(c.concept),
    strip(c.insight),
    strip(c.application),
    al,
  ]
    .filter(Boolean)
    .join(". ");
}

const run = async () => {
  console.log("loading model:", MODEL_ID);
  const extractor = await pipeline("feature-extraction", MODEL_ID, { quantized: true });
  const vectors = {};
  let dim = 0;
  let i = 0;
  for (const c of cards) {
    const text = "passage: " + passage(c);
    const out = await extractor(text, { pooling: "mean", normalize: true });
    const arr = Array.from(out.data).map((x) => Math.round(x * 1e6) / 1e6);
    dim = arr.length;
    vectors[c.id] = arr;
    i++;
    if (i % 10 === 0) console.log(`  embedded ${i}/${cards.length}`);
  }
  const payload = { _meta: { model: MODEL_ID, dim, count: cards.length, prefix: "e5" }, vectors };
  const outPath = join(ROOT, "data/embeddings.json");
  writeFileSync(outPath, JSON.stringify(payload));
  console.log(`done → data/embeddings.json (${cards.length} cards, dim ${dim})`);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
