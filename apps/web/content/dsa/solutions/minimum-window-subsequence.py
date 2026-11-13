def min_window(s1: str, s2: str) -> str:
    s, t = s1, s2
    if not t or not s:
        return ""

    def find_end(start: int):
        ti = 0
        pos = start
        while pos < len(s) and ti < len(t):
            if s[pos] == t[ti]:
                ti += 1
            pos += 1
        return pos - 1 if ti == len(t) else None

    def tighten_start(end_pos: int) -> int:
        ti = len(t) - 1
        pos = end_pos
        while pos >= 0 and ti >= 0:
            if s[pos] == t[ti]:
                ti -= 1
            pos -= 1
        return pos + 1

    start = 0
    best_len = float("inf")
    best = ""

    while start < len(s):
        end = find_end(start)
        if end is None:
            break

        real_start = tighten_start(end)
        if end - real_start + 1 < best_len:
            best_len = end - real_start + 1
            best = s[real_start : end + 1]

        start = real_start + 1

    return best
