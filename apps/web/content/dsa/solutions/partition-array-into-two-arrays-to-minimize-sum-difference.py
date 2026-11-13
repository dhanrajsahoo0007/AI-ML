import bisect
import itertools
from collections import defaultdict
from typing import List


def minimum_difference(nums: List[int]) -> int:
    n = len(nums) // 2
    total = sum(nums)
    first = nums[:n]
    second = nums[n:]

    def subset_sums_by_size(arr: List[int]) -> dict[int, list[int]]:
        groups: dict[int, list[int]] = defaultdict(list)
        for k in range(n + 1):
            for combo in itertools.combinations(arr, k):
                groups[k].append(sum(combo))
        return groups

    left_groups = subset_sums_by_size(first)
    right_groups = subset_sums_by_size(second)
    for values in right_groups.values():
        values.sort()

    min_diff = float("inf")
    goal = total // 2

    for left_count, left_sums in left_groups.items():
        right_count = n - left_count
        if right_count not in right_groups:
            continue
        right_vals = right_groups[right_count]
        for left_sum in left_sums:
            idx = bisect.bisect_left(right_vals, goal - left_sum)
            for j in (idx - 1, idx):
                if 0 <= j < len(right_vals):
                    combined = left_sum + right_vals[j]
                    min_diff = min(min_diff, abs(total - 2 * combined))
    return int(min_diff)
