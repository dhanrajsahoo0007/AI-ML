from typing import List


def max_subarray_sum_circular(nums: List[int]) -> int:
    def kadane_max(arr: List[int]) -> int:
        best = float("-inf")
        cur = 0
        for x in arr:
            cur = max(x, cur + x)
            best = max(best, cur)
        return best

    def kadane_min(arr: List[int]) -> int:
        worst = float("inf")
        cur = 0
        for x in arr:
            cur = min(x, cur + x)
            worst = min(worst, cur)
        return worst

    total = sum(nums)
    max_linear = kadane_max(nums)
    if max_linear < 0:
        return max_linear
    min_linear = kadane_min(nums)
    return max(max_linear, total - min_linear)
