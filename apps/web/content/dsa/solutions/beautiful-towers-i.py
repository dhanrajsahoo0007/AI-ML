from typing import List


def maximum_sum_of_heights(heights: List[int]) -> int:
    n = len(heights)
    best = 0
    for peak in range(n):
        total = heights[peak]
        left_cap = heights[peak]
        for i in range(peak - 1, -1, -1):
            left_cap = min(left_cap, heights[i])
            total += left_cap
        right_cap = heights[peak]
        for i in range(peak + 1, n):
            right_cap = min(right_cap, heights[i])
            total += right_cap
        best = max(best, total)
    return best
