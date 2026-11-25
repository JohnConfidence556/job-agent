from datetime import timezone

from app.timeutil import parse_timestamp


def test_five_digit_fraction_from_postgres():
    parsed = parse_timestamp("2026-11-25T12:57:14.68785+00:00")
    assert parsed.microsecond == 687850 and parsed.utcoffset() == timezone.utc.utcoffset(None)


def test_other_shapes():
    assert parse_timestamp("2026-11-25T12:57:14+00:00").second == 14
    assert parse_timestamp("2026-11-25T12:57:14.5+01:00").microsecond == 500000
    assert parse_timestamp("2026-11-25T12:57:14.123456789Z").microsecond == 123456
    assert parse_timestamp("2026-11-25T12:57:14Z").tzinfo is not None