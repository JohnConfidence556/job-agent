import re
from datetime import datetime


def parse_timestamp(value: str) -> datetime:
    """Parse Supabase timestamps on any Python version.

    Postgres drops trailing zeros ("...14.68785+00:00"), which datetime.fromisoformat
    rejects before Python 3.11. We pad the fraction to 6 digits first.
    """
    text = value.strip().replace("Z", "+00:00")
    text = re.sub(r"\.(\d+)", lambda m: "." + m.group(1)[:6].ljust(6, "0"), text, count=1)
    return datetime.fromisoformat(text)