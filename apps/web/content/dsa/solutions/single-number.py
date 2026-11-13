from typing import List


def single_number(nums: List[int]) -> int:
    x = 0
    for v in nums:
        x ^= v
    return x
