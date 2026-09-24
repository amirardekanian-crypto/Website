#!/usr/bin/env python3
"""Gregorian → Solar Hijri (Shamsi) dates for the Farsi cycle report.

    python3 .claude/skills/cycle-report/shamsi.py 2026-09-28 2026-11-01
    2026-09-28  ۶ مهر ۱۴۰۵
    2026-11-01  ۱۰ آبان ۱۴۰۵

Farsi athletes read dates in Shamsi, so every date in a Farsi report goes through this.
Nowruz (1 Farvardin) moves with the equinox, so it is a table, not a formula. Extend
NOWRUZ before 20 March 2028.
"""
import datetime as dt
import sys

NOWRUZ = {  # Shamsi year -> Gregorian date of 1 Farvardin
    1404: dt.date(2025, 3, 21),
    1405: dt.date(2026, 3, 21),
    1406: dt.date(2027, 3, 21),
    1407: dt.date(2028, 3, 20),
}
MONTHS = "فروردین اردیبهشت خرداد تیر مرداد شهریور مهر آبان آذر دی بهمن اسفند".split()
FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def to_shamsi(g: dt.date):
    year = max(y for y, d in NOWRUZ.items() if d <= g)
    if year == max(NOWRUZ) and g >= NOWRUZ[year] + dt.timedelta(days=365):
        sys.exit(f"{g}: past the NOWRUZ table; add the next year first")
    days = (g - NOWRUZ[year]).days
    for m, length in enumerate([31] * 6 + [30] * 6):
        if days < length:
            return year, m, days + 1
        days -= length


def fmt(g: dt.date) -> str:
    y, m, d = to_shamsi(g)
    return f"{d} {MONTHS[m]} {y}".translate(FA_DIGITS)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(arg, "", fmt(dt.date.fromisoformat(arg)))
