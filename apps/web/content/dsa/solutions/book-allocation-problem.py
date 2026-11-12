from typing import List


def find_pages(arr: List[int], n: int, m: int) -> int:
    if m > n:
        return -1

    def students_needed(cap: int) -> int:
        s = 1
        load = 0
        for pages in arr:
            if pages > cap:
                return m + 1
            if load + pages > cap:
                s += 1
                load = pages
            else:
                load += pages
            if s > m:
                return s
        return s

    lo, hi = max(arr), sum(arr)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if students_needed(mid) <= m:
            hi = mid
        else:
            lo = mid + 1
    return lo
