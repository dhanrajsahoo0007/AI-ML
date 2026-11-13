from typing import List


def longest_common_subpath(n: int, paths: List[List[int]]) -> int:
    if not paths:
        return 0
    min_len = min(len(p) for p in paths)

    def has_common(length: int) -> bool:
        if length == 0:
            return True
        common: set[tuple[int, ...]] | None = None
        for path in paths:
            cur = {
                tuple(path[i : i + length])
                for i in range(len(path) - length + 1)
            }
            if common is None:
                common = cur
            else:
                common &= cur
            if not common:
                return False
        return True

    lo, hi = 0, min_len
    best = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if has_common(mid):
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best
