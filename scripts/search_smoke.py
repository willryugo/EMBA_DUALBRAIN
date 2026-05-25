"""검색 회귀 스모크 테스트.

핵심 시나리오들이 사전 계산 인덱스 갱신 후에도 여전히 정확한 카드를 반환하는지 확인.
lib/recommend.ts 의 로직을 Python으로 단순 포팅 (필드 가중치 + 별칭 + 도메인 추론 + NFC 정규화).
"""
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.stdout.reconfigure(encoding="utf-8")


def load(p):
    with open(ROOT / p, encoding="utf-8") as f:
        return json.load(f)


def norm(s):
    return unicodedata.normalize("NFC", s).lower() if s else ""


# 도메인 추론 힌트 (lib/recommend.ts 와 동기화)
DOMAIN_HINTS = {
    "조직·HR": ["조직", "HR", "인사", "승진", "이직", "퇴사", "채용", "리더십", "동기", "사기", "성과급", "면담", "갈등", "문화", "팀", "평가", "다양성", "편견"],
    "재무·회계": ["재무", "회계", "현금", "매출", "이익", "운전자본", "예산", "재무제표", "감사", "원가"],
    "마케팅": ["마케팅", "광고", "브랜드", "가격", "고객", "STP", "타겟", "세분화", "포지셔닝", "프로모션"],
    "운영·SCM": ["운영", "재고", "공급망", "물류", "발주", "신문판매원", "리드타임", "조달", "생산"],
    "데이터·AI": ["데이터", "분석", "AI", "예측", "머신러닝", "지표", "KPI", "딥러닝"],
    "전략": ["전략", "포지셔닝", "경쟁", "차별화", "성장", "비전"],
    "윤리·거버넌스": ["윤리", "준법", "컴플라이언스", "지배구조", "내부고발", "투명성"],
}


def infer_domain(q):
    qn = norm(q)
    best = None
    best_score = 0
    for dom, hints in DOMAIN_HINTS.items():
        score = sum(1 for h in hints if norm(h) in qn)
        if score > best_score:
            best_score = score
            best = dom
    return best


def recommend(query, cards, aliases, my_inds=None):
    my_inds = my_inds or []
    tokens = set(norm(t) for t in query.split() if len(t) >= 2)
    # crude: 별칭 expansion — query가 별칭에 등장하면 그 카드의 별칭들도 토큰에
    # (단순화. 실제 TS 로직은 더 복잡한 CONCEPT_MAP 사용)
    for cid, aliases_list in aliases.items():
        if cid == "_meta":
            continue
        for a in aliases_list:
            an = norm(a)
            if any(t in an or an in t for t in tokens):
                tokens.add(an)

    domain = infer_domain(query)
    scored = []
    for c in cards:
        alias_text = " ".join(aliases.get(c["id"], [])) if isinstance(aliases.get(c["id"]), list) else ""
        fields = [
            (c.get("hook", ""), 4),
            (c.get("concept", ""), 3),
            (alias_text, 3),
            (c.get("insight", ""), 2),
            (c.get("application", ""), 2),
            (c.get("decision", ""), 2),
            (c.get("problem_scene", ""), 1.5),
            (c.get("case_title", ""), 1.5),
            (c.get("quote", ""), 1),
            (" ".join(c.get("checklist", [])), 1),
            (c.get("case_body", ""), 0.5),
        ]
        s = 0
        for text, w in fields:
            t = norm(text)
            for tok in tokens:
                if tok and tok in t:
                    s += w
        if domain and domain in c.get("domain", []):
            s += 3
        for i in c.get("industry", []):
            if i in my_inds and i != "범용(전 산업)":
                s += 2
        scored.append((c["id"], s, c.get("hook", "")))
    scored.sort(key=lambda x: -x[1])
    return scored


# 핵심 시나리오 — 카드 ID 또는 카드 ID 일부 매칭
SCENARIOS = [
    ("승진", ["mpo-rob-parson", "mpo-recruitment-vs-promote", "mpo-weak-ties"], 3),
    ("팀이 회식만 하고 일은 안 한다", ["mpo-two-factor-herzberg", "mpo-burnout-prevention", "mpo-intrinsic-motivation", "mpo-radical-candor"], 5),
    ("흑자인데 망함", ["acc-accrual-basis"], 1),
    ("광고비 폭증", ["ba-cac-trap"], 3),
    ("약사 추천", ["mkt-pharmacist-relationship"], 1),
    ("성과는 좋은데 팀이 망가짐", ["mpo-rob-parson"], 3),
    ("회의가 길고 결정 안남", ["mpo-terracog", "ethics-groupthink", "mkt-workshop-decisions"], 5),
    ("ESG 보고서", ["eth-greenwashing", "eth-porter-kramer-csv", "eth-carroll-csr"], 5),
    ("재고 얼마나 시킬까", ["ms-newsvendor", "ms-fashion-seasonality"], 3),
    ("티몬 위메프 정산", ["eth-tmon-wemakeprice"], 1),
    ("외부 영입 vs 내부 키우기", ["mpo-recruitment-vs-promote"], 1),
    ("연봉 비공개", ["mpo-pay-secrecy"], 1),
    ("AI 책임 누가", ["ba-explainability-tradeoff"], 3),
    ("브랜드 확장", ["mkt-brand-extension"], 1),
]


def main():
    cards = load("data/cards.json")
    aliases = load("data/aliases.json")

    passed = 0
    failed = []
    for query, expected_ids, top_n in SCENARIOS:
        ranked = recommend(query, cards, aliases)
        top = [r[0] for r in ranked[:top_n]]
        hits = [eid for eid in expected_ids if eid in top]
        ok = len(hits) > 0
        if ok:
            passed += 1
            print(f"  ✓ '{query}' → top{top_n}에 {hits[0]} 매칭")
        else:
            failed.append((query, expected_ids, [r[0] for r in ranked[:5]]))
            print(f"  ✗ '{query}'")
            print(f"      기대: {expected_ids}")
            print(f"      실제 top5: {[r[0] for r in ranked[:5]]}")

    print()
    print(f"통과: {passed}/{len(SCENARIOS)}")
    if failed:
        print(f"실패 {len(failed)}건. 별칭 보강 필요.")
        sys.exit(1)
    else:
        print("✓ 회귀 OK")


if __name__ == "__main__":
    main()
