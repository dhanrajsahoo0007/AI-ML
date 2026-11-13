from typing import List


def min_sub_array_len(target: int, nums: List[int]) -> int:
    left = 0
    cur = 0
    best = 0

    for right in range(len(nums)):
        cur += nums[right]

        while cur >= target:
            width = right - left + 1
            best = width if best == 0 else min(best, width)
            cur -= nums[left]
            left += 1

    return best
