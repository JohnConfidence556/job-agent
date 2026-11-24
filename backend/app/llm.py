import json
import logging
from functools import lru_cache
from typing import TypeVar

from groq import BadRequestError, Groq, RateLimitError
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.db import get_supabase

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    pass


@lru_cache
def get_groq() -> Groq:
    return Groq(api_key=get_settings().groq_api_key, max_retries=3, timeout=60)


def _create(model: str, messages: list[dict], reasoning_effort: str | None):
    options = {}
    if reasoning_effort:
        options["reasoning_effort"] = reasoning_effort
    try:
        return get_groq().chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0,
            **options,
        )
    except RateLimitError as exc:
        raise LLMError("Groq rate limit reached") from exc


def _record_usage(task: str, model: str, user_id: str | None, usage) -> None:
    if usage is None:
        return
    try:
        get_supabase().table("llm_usage").insert(
            {
                "user_id": user_id,
                "task": task,
                "model": model,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
            }
        ).execute()
    except Exception:
        logger.warning("Could not record LLM usage", exc_info=True)


def complete_json(
    *,
    task: str,
    system: str,
    user: str,
    schema: type[T],
    model: str | None = None,
    user_id: str | None = None,
    reasoning_effort: str | None = "low",
    max_attempts: int = 2,
) -> T:
    model = model or get_settings().llm_heavy_model
    schema_text = json.dumps(schema.model_json_schema(), separators=(",", ":"))
    messages = [
        {
            "role": "system",
            "content": (
                f"{system}\n\nReply with one JSON object matching this JSON Schema. "
                f"Output JSON only.\n{schema_text}"
            ),
        },
        {"role": "user", "content": user},
    ]

    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = _create(model, messages, reasoning_effort)
        except BadRequestError as exc:
            last_error = exc
            logger.warning(
                "%s: Groq rejected the request (attempt %s)", task, attempt, exc_info=True
            )
            continue

        _record_usage(task, model, user_id, response.usage)
        content = response.choices[0].message.content or ""
        try:
            return schema.model_validate_json(content)
        except ValidationError as exc:
            last_error = exc
            messages.append({"role": "assistant", "content": content})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        f"That JSON did not match the schema: {str(exc)[:1000]}. "
                        "Reply again with corrected JSON only."
                    ),
                }
            )

    raise LLMError(f"{task}: no valid output after {max_attempts} attempts") from last_error