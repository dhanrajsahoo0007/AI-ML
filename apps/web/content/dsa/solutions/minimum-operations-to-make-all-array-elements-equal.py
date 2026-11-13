from bisect import bisect_left
from typing import List


def min_operations(nums: List[int], queries: List[int]) -> List[int]:
    nums.sort()
    n = len(nums)
    pref = [0] * (n + 1)
    for i in range(n):
        pref[i + 1] = pref[i] + nums[i]
    out: List[int] = []
    for q in queries:
        i = bisect_left(nums, q)
        left_ops = q * i - pref[i]
        right_ops = (pref[n] - pref[i]) - q * (n - i)
        out.append(left_ops + right_ops)
    return out
