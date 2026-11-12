from typing import List


def longest_subarray_positive_sum(nums: List[int], k: int) -> int:
    left = 0
    cur = 0
    best = 0
    for right in range(len(nums)):
        cur += nums[right]
        while cur > k and left <= right:
            cur -= nums[left]
            left += 1
        if cur == k:
            best = max(best, right - left + 1)
    return best
