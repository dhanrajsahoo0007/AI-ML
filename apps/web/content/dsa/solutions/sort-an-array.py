from typing import List


def sort_array(nums: List[int]) -> List[int]:
    if len(nums) <= 1:
        return list(nums)
    head = sort_array(nums[:-1])
    return _insert_sorted(head, nums[-1])


def _insert_sorted(sorted_vals: List[int], value: int) -> List[int]:
    if not sorted_vals or value >= sorted_vals[-1]:
        return sorted_vals + [value]
    return _insert_sorted(sorted_vals[:-1], value) + [sorted_vals[-1]]
