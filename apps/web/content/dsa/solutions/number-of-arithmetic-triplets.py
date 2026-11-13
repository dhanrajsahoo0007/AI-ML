from typing import List


def arithmetic_triplets(nums: List[int], diff: int) -> int:
    values = set(nums)
    return sum((x - diff in values) and (x + diff in values) for x in nums)
