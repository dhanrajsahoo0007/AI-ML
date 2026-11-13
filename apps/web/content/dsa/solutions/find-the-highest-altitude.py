from typing import List


def largest_altitude(gain: List[int]) -> int:
    cur = 0
    best = 0
    for g in gain:
        cur += g
        best = max(best, cur)
    return best
