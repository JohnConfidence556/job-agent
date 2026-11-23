import hashlib
import re
import ftfy

from bs4 import BeautifulSoup


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator="\n")
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def make_dedupe_hash(company: str, title: str) -> str:
    key = f"{_normalize(company)}|{_normalize(title)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def split_regions(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"[,;/]", value) if part.strip()]


def fix_text(text: str) -> str:
    return ftfy.fix_encoding(text)