#!/usr/bin/env python3
"""Build public/questionnaires/data/what-are-you-like-bank.json.

The bank is pure data: engines read it, nobody hand-codes a question into a
page. This resolves the canonical universal-30 play ORDER (founder ruling
2026-08-01) against the canonical scenario bank in the thrive-website repo and
writes the 30 scenarios Cowch ships, with provenance in the meta block.

Source of truth (read-only, another repo on the same machine):
  ~/thrive-website/prototypes/data/scenario-bank.json   — the 216-scenario bank
  ~/thrive-website/prototypes/data/build-proto-a.py     — the ORDER list

Re-run after any change upstream:
  python3 tools/build-what-are-you-like-bank.py
"""
import json, re, subprocess
from collections import Counter
from pathlib import Path

SRC = Path.home() / "thrive-website"
OUT = Path(__file__).resolve().parent.parent / "public/questionnaires/data/what-are-you-like-bank.json"

bank = json.loads((SRC / "prototypes/data/scenario-bank.json").read_text())
by_id = {s["id"]: s for s in bank["scenarios"]}

# The ORDER list is parsed out of the canonical build script rather than
# retyped, so a founder re-curation upstream flows straight through here.
build_src = (SRC / "prototypes/data/build-proto-a.py").read_text()
ORDER = re.findall(r'"([a-z0-9-]+)"', re.search(r"ORDER = \[(.*?)\]", build_src, re.S).group(1))

sha = subprocess.run(["git", "-C", str(SRC), "rev-parse", "HEAD"],
                     capture_output=True, text=True).stdout.strip()

assert len(ORDER) == 30, f"expected the universal-30, got {len(ORDER)}"
missing = [i for i in ORDER if i not in by_id]
assert not missing, f"ids not in bank: {missing}"
assert all(by_id[i]["status"] == "core" for i in ORDER), "proposed axes must not be wired in"
assert all(len(by_id[i]["options"]) == 4 for i in ORDER), "core standard is four options"
counts = Counter(i.split("-")[0] for i in ORDER)
assert all(counts[p] == 5 for p in "oceanr"), f"five per axis, got {counts}"

questions = []
for i in ORDER:
    q = {"id": i, "s": by_id[i]["scenario"],
         "opts": [{"t": o["text"], "w": o["weights"]} for o in by_id[i]["options"]]}
    if by_id[i].get("exit"):
        q["x"] = by_id[i]["exit"]
    questions.append(q)

doc = {
    "meta": {
        "instrument": "What are you like, anyway?",
        "set": "universal-30 core",
        "note": "Pure data. The engine reads this; questions are never hand-coded into a page. "
                "Five scenarios per axis across three acts of ten; every scenario carries four "
                "options plus an honest exit (rendered by the engine, overridden here via 'x').",
        "axes": bank["meta"]["axes"],
        "source_repo": "thrive-website",
        "source_files": ["prototypes/data/scenario-bank.json", "prototypes/data/build-proto-a.py"],
        "source_commit": sha,
        "bank_version": bank["meta"]["version"],
        "count": len(questions),
    },
    "questions": questions,
}
OUT.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {OUT} — {len(questions)} scenarios, source {sha[:7]}")
