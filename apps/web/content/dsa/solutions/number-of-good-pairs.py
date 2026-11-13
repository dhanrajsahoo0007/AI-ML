from collections import Counter
from typing import List


def num_identical_pairs(nums: List[int]) -> int:
    counts = Counter(nums)
    return sum(f * (f - 1) // 2 for f in counts.values())
