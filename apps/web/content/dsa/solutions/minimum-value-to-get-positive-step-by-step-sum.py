from typing import List


def min_start_value(nums: List[int]) -> int:
    s = 0
    min_pre = 0
    for x in nums:
        s += x
        min_pre = min(min_pre, s)
    return max(1, 1 - min_pre)
