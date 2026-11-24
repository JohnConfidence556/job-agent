import logging
import sys
from pathlib import Path

from app.services.cv import extract_cv_text, parse_cv_text, save_master_cv


def main(user_id: str, file_path: str) -> None:
    path = Path(file_path)
    text = extract_cv_text(path.read_bytes(), path.name)
    cv = parse_cv_text(text, user_id=user_id)
    row = save_master_cv(user_id, cv)

    print(f"Saved master CV version {row['version']}")
    print(f"  name: {cv.full_name}")
    for job in cv.experience:
        print(f"  {job.id}: {job.title} at {job.company} ({len(job.bullets)} bullets)")
    print(
        f"  education: {len(cv.education)}, projects: {len(cv.projects)}, "
        f"skills: {len(cv.skills)}"
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    if len(sys.argv) != 3:
        sys.exit('Usage: python -m workers.import_cv <user_id> "<path to cv.pdf or cv.docx>"')
    main(sys.argv[1], sys.argv[2])