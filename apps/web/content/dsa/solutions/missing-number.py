from typing import List


def missing_number(nums: List[int]) -> int:
    x = len(nums)
    for i, v in enumerate(nums):
        x ^= i ^ v
    return x
