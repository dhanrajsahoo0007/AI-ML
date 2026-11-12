from typing import List


def next_greatest_letter(letters: List[str], target: str) -> str:
    n = len(letters)
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if letters[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return letters[lo % n]
