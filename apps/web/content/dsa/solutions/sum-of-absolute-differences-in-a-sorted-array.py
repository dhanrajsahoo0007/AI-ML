from typing import List


def get_sum_absolute_differences(nums: List[int]) -> List[int]:
    n = len(nums)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] + nums[i]
    total = prefix[n]
    out: List[int] = []
    for i in range(n):
        left = nums[i] * i - prefix[i]
        right = (total - prefix[i + 1]) - nums[i] * (n - 1 - i)
        out.append(left + right)
    return out
