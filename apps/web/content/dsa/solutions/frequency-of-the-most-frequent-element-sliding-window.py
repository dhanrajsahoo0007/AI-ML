from typing import List


def max_frequency(nums: List[int], k: int) -> int:
    nums.sort()
    total = 0
    left = 0
    best = 0
    for right in range(len(nums)):
        total += nums[right]
        while nums[right] * (right - left + 1) > total + k:
            total -= nums[left]
            left += 1
        best = max(best, right - left + 1)
    return best
