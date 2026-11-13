def longest_repeating_substring(s: str) -> int:
    n = len(s)

    def has_repeat(L: int) -> bool:
        if L == 0:
            return True
        seen = set()
        for i in range(n - L + 1):
            sub = s[i : i + L]
            if sub in seen:
                return True
            seen.add(sub)
        return False

    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if has_repeat(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
