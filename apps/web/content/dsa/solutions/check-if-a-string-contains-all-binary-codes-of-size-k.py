def has_all_codes(s: str, k: int) -> bool:
    need = 1 << k
    if len(s) < k + need - 1:
        return False
    cur = 0
    mask = need - 1
    seen: set[int] = set()
    for i, ch in enumerate(s):
        cur = ((cur << 1) | (ch == "1")) & mask
        if i >= k - 1:
            seen.add(cur)
            if len(seen) == need:
                return True
    return len(seen) == need
