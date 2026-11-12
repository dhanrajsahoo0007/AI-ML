from typing import List


def pivot_index(nums: List[int]) -> int:
    total = sum(nums)
    left = 0
    for i, x in enumerate(nums):
        right = total - left - x
        if left == right:
            return i
        left += x
    return -1
