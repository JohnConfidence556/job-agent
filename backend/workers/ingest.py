import logging
from collections.abc import Callable

from app.schemas.job import JobCreate
from workers.sources.remotive import fetch_remotive, parse_remotive_jobs
from workers.store import finish_run, save_jobs, start_ingest_run

logger = logging.getLogger(__name__)


def ingest_source(
    source: str,
    fetch: Callable[[], list[dict]],
    parse: Callable[[list[dict]], list[JobCreate]],
) -> str:
    run_id = start_ingest_run(source)
    try:
        raw_jobs = fetch()
        jobs = parse(raw_jobs)
        stats = save_jobs(jobs)
        stats["fetched"] = len(raw_jobs)
        stats["skipped_malformed"] = len(raw_jobs) - len(jobs)
        finish_run(run_id, "succeeded", stats)
        logger.info("Ingest %s succeeded: %s", source, stats)
        return "succeeded"
    except Exception as exc:
        logger.exception("Ingest %s failed", source)
        finish_run(run_id, "failed", {}, error=str(exc)[:500])
        return "failed"


SOURCES = {
    "remotive": (fetch_remotive, parse_remotive_jobs),
}


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    for name, (fetch, parse) in SOURCES.items():
        ingest_source(name, fetch, parse)


if __name__ == "__main__":
    main()