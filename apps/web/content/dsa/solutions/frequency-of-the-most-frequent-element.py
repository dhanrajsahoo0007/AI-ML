from typing import List


def max_frequency(nums: List[int], k: int) -> int:
    nums_sorted = sorted(nums)
    left = 0
    total = 0
    best = 0

    for right in range(len(nums_sorted)):
        total += nums_sorted[right]

        while nums_sorted[right] * (right - left + 1) > total + k:
            total -= nums_sorted[left]
            left += 1

        best = max(best, right - left + 1)

    return best
