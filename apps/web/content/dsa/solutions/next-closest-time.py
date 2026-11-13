def next_closest_time(time: str) -> str:
    choices = [time[0], time[1], time[3], time[4]]

    def to_minutes(hhmm: str) -> int:
        return int(hhmm[:2]) * 60 + int(hhmm[3:])

    start = to_minutes(time)
    candidates: set[int] = set()

    for a in choices:
        for b in choices:
            for c in choices:
                for d in choices:
                    hh = int(a + b)
                    mm = int(c + d)
                    if hh < 24 and mm < 60:
                        candidates.add(hh * 60 + mm)

    greater = [t for t in candidates if t > start]
    pick = min(greater) if greater else min(candidates)
    return f"{pick // 60:02d}:{pick % 60:02d}"
