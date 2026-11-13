from typing import List


def longest_subarray_sum_k(nums: List[int], k: int) -> int:
    prefix = 0
    first_index: dict[int, int] = {0: -1}
    best = 0
    for i, x in enumerate(nums):
        prefix += x
        need = prefix - k
        if need in first_index:
            best = max(best, i - first_index[need])
        if prefix not in first_index:
            first_index[prefix] = i
    return best
