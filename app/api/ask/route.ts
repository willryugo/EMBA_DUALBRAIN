// 두 번째 뇌의 '생성형 진단' — 사용자의 실제 고민 + 키워드 엔진이 고른 상위 카드들을
// Claude(Haiku 4.5)에게 넘겨, 고민을 해석하고 한 줄 처방을 만든다.
//
// ANTHROPIC_API_KEY 미설정 시 { ok:false, reason:"no_key" } 반환(200) →
// 클라이언트는 오프라인 합성 진단(buildDiagnosis)으로 그대로 폴백한다.
// 키·콘텐츠·비용은 수달님 몫: Vercel 환경변수에 ANTHROPIC_API_KEY 입력하면 켜짐.

export const runtime = "edge";

// 모델: 로드맵 2단계에서 합의한 Haiku 4.5(빠르고 저렴, 카드 컨텍스트 처방엔 충분).
const MODEL = "claude-haiku-4-5";

interface CardLite {
  id: string;
  concept?: string;
  hook?: string;
  course?: string;
  decision?: string;
  insight?: string;
}
interface Body {
  problem?: string;
  cards?: CardLite[];
  domain?: string;
  industries?: string[];
}

function clip(s: string | undefined, n: number): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const problem = clip(body.problem, 400);
  const cards = (Array.isArray(body.cards) ? body.cards : []).slice(0, 5);
  if (!problem || cards.length === 0) {
    return Response.json({ ok: false, reason: "empty" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // 키 없음 → 클라이언트가 오프라인 진단으로 폴백.
    return Response.json({ ok: false, reason: "no_key" });
  }

  // 상위 카드 요약 — 토큰 절약 위해 핵심 필드만.
  const cardCtx = cards
    .map((c, i) => {
      const parts = [
        `[${i + 1}] ${clip(c.concept, 40)}`,
        c.course ? `(${clip(c.course, 30)})` : "",
        c.hook ? `훅: ${clip(c.hook, 80)}` : "",
        c.decision ? `결정: ${clip(c.decision, 120)}` : "",
        c.insight ? `통찰: ${clip(c.insight, 120)}` : "",
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join("\n");

  const domainLine = body.domain ? `추정 도메인: ${clip(body.domain, 30)}` : "";
  const indLine =
    Array.isArray(body.industries) && body.industries.length
      ? `사용자 산업: ${body.industries.slice(0, 3).map((s) => clip(s, 20)).join(", ")}`
      : "";

  const system =
    "너는 'DualBrain — 두 번째 뇌'다. 연세 EMBA 17기가 회의 30분 전 꺼내쓰는 학습 자산 코파일럿. " +
    "사용자의 실무 고민을 받아, 아래 후보 카드(수업에서 배운 개념)들 중 가장 가까운 렌즈로 고민을 재해석하고 한 줄 처방을 준다. " +
    "사용자를 '수달님' 같은 호칭 없이 담백한 ~합니다 톤으로. 과장·면책·인사말 금지. 카드에 없는 사실을 지어내지 말 것.\n\n" +
    "반드시 아래 JSON만 출력(설명·코드펜스 금지):\n" +
    '{"lens":"<도메인 · 핵심개념, 12자 내외>","body":"<고민을 한두 문장으로 재해석. 그 다음 줄에 정확히 \\n\\n한 줄로 →\\n 을 붙이고 한 줄 처방 1문장>"}';

  const user =
    `고민: ${problem}\n` +
    (domainLine ? domainLine + "\n" : "") +
    (indLine ? indLine + "\n" : "") +
    `\n후보 카드(상위 ${cards.length}):\n${cardCtx}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.log(`[ask] anthropic ${res.status}: ${txt.slice(0, 200)}`);
      return Response.json({ ok: false, reason: `api_${res.status}` });
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text || "")
        .join("")
        .trim() || "";

    // JSON 추출 — 모델이 코드펜스를 붙여도 견디게.
    const jsonStr = (text.match(/\{[\s\S]*\}/) || [text])[0];
    let parsed: { lens?: string; body?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.log(`[ask] parse fail: ${text.slice(0, 120)}`);
      return Response.json({ ok: false, reason: "parse" });
    }

    const lens = clip(parsed.lens, 60);
    const dbody = String(parsed.body || "").trim().slice(0, 700);
    if (!lens || !dbody) {
      return Response.json({ ok: false, reason: "empty_out" });
    }

    return Response.json({ ok: true, diagnosis: { lens, body: dbody } });
  } catch (e) {
    console.log(`[ask] error: ${e instanceof Error ? e.message : String(e)}`);
    return Response.json({ ok: false, reason: "fetch_err" });
  }
}
