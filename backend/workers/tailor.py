import logging
import sys

from app.db import get_supabase
from app.services.tailoring import tailor_for_match


def top_match_id(user_id: str) -> str:
    rows = (
        get_supabase()
        .table("matches")
        .select("id")
        .eq("user_id", user_id)
        .order("fit_score", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        sys.exit("This user has no matches yet. Run workers.search first.")
    return rows[0]["id"]


def show(row: dict) -> None:
    content, report = row["content"], row["validation_report"]
    print(f"Tailored CV version {row['version']} for match {row['match_id']}")
    summary = content["summary"]
    print("\nSUMMARY:", summary["text"] if summary else "(none)", f"[{report['summary']}]")
    for exp in content["experience"]:
        print(f"\n{exp['source_id']}: {exp['title']} at {exp['company']}")
        for bullet in exp["bullets"]:
            mark = "REWRITTEN" if bullet["rewritten"] else "original"
            print(f"  ({mark}) {bullet['source_id']}: {bullet['text']}")
    for proj in content["projects"]:
        print(f"\n{proj['source_id']}: project {proj['name']}")
        for bullet in proj["bullets"]:
            mark = "REWRITTEN" if bullet["rewritten"] else "original"
            print(f"  ({mark}) {bullet['source_id']}: {bullet['text']}")
    print("\nSKILLS:", ", ".join(s["name"] for s in content["skills"]))
    print("GAPS:", "; ".join(content["gaps"]) or "(none)")
    print(f"\nRewritten bullets: {report['rewritten_bullets']}")
    print(f"Fell back to the original text: {len(report['fallbacks'])}")
    for item in report["fallbacks"]:
        print(f"  {item['where']}: {item['problems']}")


def main(user_id: str, match_id: str | None, regenerate: bool) -> None:
    show(tailor_for_match(user_id, match_id or top_match_id(user_id), regenerate))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not 1 <= len(args) <= 2:
        sys.exit("Usage: python -m workers.tailor <user_id> [match_id] [--regenerate]")
    main(args[0], args[1] if len(args) == 2 else None, "--regenerate" in sys.argv)