from typing import List


def find_kth_positive(arr: List[int], k: int) -> int:
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        missing = arr[mid] - (mid + 1)
        if missing < k:
            lo = mid + 1
        else:
            hi = mid - 1
    return lo + k
