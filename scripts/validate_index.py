"""사전 계산 인덱스 (aliases.json + neighbors.json) 무결성 검증.

용도: REINDEX 워크플로 5단계. 카드 추가/별칭 갱신 후 커밋 전 자동 검증.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.stdout.reconfigure(encoding="utf-8")


def load(p):
    with open(ROOT / p, encoding="utf-8") as f:
        return json.load(f)


def main():
    cards = load("data/cards.json")
    aliases = load("data/aliases.json")
    neighbors = load("data/neighbors.json")
    card_ids = set(c["id"] for c in cards)

    errs = []
    warns = []

    # Aliases
    alias_keys = set(k for k in aliases.keys() if k != "_meta")
    missing_a = card_ids - alias_keys
    extra_a = alias_keys - card_ids
    if missing_a:
        errs.append(f"aliases.json 누락: {sorted(missing_a)}")
    if extra_a:
        errs.append(f"aliases.json 유령 ID: {sorted(extra_a)}")
    for cid, lst in aliases.items():
        if cid == "_meta":
            continue
        if not isinstance(lst, list):
            errs.append(f"aliases.json[{cid}] 는 array가 아님")
            continue
        if len(lst) < 8:
            warns.append(f"aliases.json[{cid}] 별칭 수 부족 ({len(lst)} < 8)")
        if any(not isinstance(x, str) for x in lst):
            errs.append(f"aliases.json[{cid}] 에 비문자열 항목")

    # Neighbors
    nbr_keys = set(k for k in neighbors.keys() if k != "_meta")
    missing_n = card_ids - nbr_keys
    extra_n = nbr_keys - card_ids
    if missing_n:
        errs.append(f"neighbors.json 누락: {sorted(missing_n)}")
    if extra_n:
        errs.append(f"neighbors.json 유령 ID: {sorted(extra_n)}")
    for cid, lst in neighbors.items():
        if cid == "_meta":
            continue
        if not isinstance(lst, list):
            errs.append(f"neighbors.json[{cid}] 는 array가 아님")
            continue
        if len(lst) != 8:
            errs.append(f"neighbors.json[{cid}] 이웃 수 != 8 (got {len(lst)})")
        if cid in lst:
            errs.append(f"neighbors.json[{cid}] 자기 자신 포함")
        for n in lst:
            if n not in card_ids:
                errs.append(f"neighbors.json[{cid}] 유효하지 않은 이웃 ID: {n}")

    # 양방향성 체크 (warn만, 강제 X)
    asym = 0
    for cid in nbr_keys:
        if cid == "_meta":
            continue
        my_nbrs = neighbors.get(cid, [])
        if not isinstance(my_nbrs, list):
            continue
        for n in my_nbrs:
            n_nbrs = neighbors.get(n, [])
            if isinstance(n_nbrs, list) and cid not in n_nbrs:
                asym += 1
    if asym > 0:
        warns.append(f"비대칭 이웃 관계 {asym}개 (A→B인데 B→A 아님). 정상이지만 너무 많으면 보강 고려.")

    # 통계
    total_aliases = sum(len(v) for k, v in aliases.items() if k != "_meta" and isinstance(v, list))
    avg = total_aliases / max(len(alias_keys), 1)
    print(f"카드 수: {len(card_ids)}")
    print(f"별칭 총 {total_aliases}개 · 카드당 평균 {avg:.1f}개")
    print(f"이웃 매트릭스: {len(nbr_keys)}장 × 8 = {len(nbr_keys) * 8}개 엣지")
    print()

    if warns:
        print("경고:")
        for w in warns:
            print(f"  · {w}")
        print()

    if errs:
        print("오류:")
        for e in errs:
            print(f"  ✗ {e}")
        sys.exit(1)
    else:
        print("✓ 무결성 OK")


if __name__ == "__main__":
    main()
