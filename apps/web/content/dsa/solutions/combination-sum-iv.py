from typing import List


def combination_sum4(nums: List[int], target: int) -> int:
    dp = [0] * (target + 1)
    dp[0] = 1
    for s in range(1, target + 1):
        for x in nums:
            if x <= s:
                dp[s] += dp[s - x]
    return dp[target]


# --- Glue (same as the starter) ---

def combination_sum4_tests(a0, a1):  # the entry the tests call
    result = combination_sum4(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
