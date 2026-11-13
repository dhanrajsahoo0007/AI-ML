from typing import List


def longest_subarray_sum_k(nums: List[int], k: int) -> int:
    index_by_sum = {0: -1}
    prefix = 0
    best = 0

    for i, num in enumerate(nums):
        prefix += num

        if prefix - k in index_by_sum:
            best = max(best, i - index_by_sum[prefix - k])

        if prefix not in index_by_sum:
            index_by_sum[prefix] = i

    return best
