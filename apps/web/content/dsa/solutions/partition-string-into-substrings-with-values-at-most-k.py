def minimum_partition(s: str, k: int) -> int:
    parts = 1
    val = 0
    for ch in s:
        d = int(ch)
        if d > k:
            return -1
        nxt = val * 2 + d
        if nxt > k:
            parts += 1
            val = d
            if val > k:
                return -1
        else:
            val = nxt
    return parts
