from typing import List


def min_subset_sum_difference(nums: List[int]) -> int:
    total = sum(nums)
    half = total // 2
    dp = [False] * (half + 1)
    dp[0] = True
    for x in nums:
        for j in range(half, x - 1, -1):
            dp[j] = dp[j] or dp[j - x]
    best = 0
    for j in range(half, -1, -1):
        if dp[j]:
            best = j
            break
    return total - 2 * best
