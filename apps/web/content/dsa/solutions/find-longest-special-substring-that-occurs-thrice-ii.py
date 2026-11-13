from itertools import groupby
from typing import List, Tuple


def maximum_length(s: str) -> int:
    runs: List[Tuple[str, int]] = [(ch, len(list(g))) for ch, g in groupby(s)]

    def count_for_letter(ch: str, length: int) -> int:
        total = 0
        for c, ln in runs:
            if c == ch and ln >= length:
                total += ln - length + 1
        return total

    def ok(length: int) -> bool:
        if length <= 0:
            return False
        for ch in set(s):
            if count_for_letter(ch, length) >= 3:
                return True
        return False

    lo, hi = 1, len(s)
    ans = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if ok(mid):
            ans = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return ans
