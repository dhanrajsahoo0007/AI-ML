from typing import List


def two_sum(nums: List[int], target: int) -> List[int]:
    num_map: dict[int, int] = {}  # value -> index for everything seen so far
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]  # earlier index first, then current
        num_map[num] = i
    return []  # problem guarantees one solution; this is a safe fallback
