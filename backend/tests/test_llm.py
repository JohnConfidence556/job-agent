from types import SimpleNamespace

import pytest
from pydantic import BaseModel

from app import llm


class Out(BaseModel):
    score: int


def fake_response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=None,
    )


def install_fake(monkeypatch, replies):
    calls = []

    def fake_create(model, messages, reasoning_effort):
        calls.append(list(messages))
        return fake_response(replies[len(calls) - 1])

    monkeypatch.setattr(llm, "_create", fake_create)
    monkeypatch.setattr(llm, "_record_usage", lambda *args, **kwargs: None)
    return calls


def run():
    return llm.complete_json(
        task="test",
        system="Be brief.",
        user="Score it.",
        schema=Out,
        model="test-model",
    )


def test_returns_validated_model(monkeypatch):
    calls = install_fake(monkeypatch, ['{"score": 7}'])
    assert run().score == 7
    assert len(calls) == 1


def test_retries_once_when_output_does_not_match(monkeypatch):
    calls = install_fake(monkeypatch, ['{"score": "high"}', '{"score": 9}'])
    assert run().score == 9
    assert len(calls) == 2
    assert "did not match" in calls[1][-1]["content"]


def test_gives_up_after_max_attempts(monkeypatch):
    install_fake(monkeypatch, ["not json", "still not json"])
    with pytest.raises(llm.LLMError):
        run()