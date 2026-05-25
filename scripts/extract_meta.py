import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'Z:\EMBA\dualbrain\data\cards.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)
print(f"TOTAL: {len(cards)}", file=sys.stderr)
out = []
for c in cards:
    out.append({
        'id': c['id'],
        'course': c['course'],
        'hook': c.get('hook', ''),
        'concept': c.get('concept', ''),
        'insight_short': c.get('insight', '')[:160],
        'domain': c.get('domain', []),
        'industry': c.get('industry', []),
    })
print(json.dumps(out, ensure_ascii=False, indent=1))
