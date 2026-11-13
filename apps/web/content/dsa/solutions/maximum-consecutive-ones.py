from typing import List


def find_max_consecutive_ones(nums: List[int]) -> int:
    best = 0
    cur = 0
    for x in nums:
        if x == 1:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best
