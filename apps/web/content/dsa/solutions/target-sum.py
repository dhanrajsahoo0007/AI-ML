from typing import List


def find_target_sum_ways(nums: List[int], target: int) -> int:
    total = sum(nums)
    if abs(target) > total or (total + target) % 2 != 0:
        return 0
    p = (total + target) // 2
    zeros = sum(1 for x in nums if x == 0)
    arr = [x for x in nums if x != 0]
    dp = [0] * (p + 1)
    dp[0] = 1
    for x in arr:
        for j in range(p, x - 1, -1):
            dp[j] += dp[j - x]
    return dp[p] * (1 << zeros)
