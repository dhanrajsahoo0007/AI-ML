from typing import List


def _rob_range(nums: List[int], lo: int, hi: int) -> int:
    if lo > hi:
        return 0
    if lo == hi:
        return nums[lo]
    prev2 = nums[lo]
    prev1 = max(nums[lo], nums[lo + 1])
    for i in range(lo + 2, hi + 1):
        prev2, prev1 = prev1, max(prev1, prev2 + nums[i])
    return prev1


def rob(nums: List[int]) -> int:
    n = len(nums)
    if n == 1:
        return nums[0]
    return max(_rob_range(nums, 0, n - 2), _rob_range(nums, 1, n - 1))
