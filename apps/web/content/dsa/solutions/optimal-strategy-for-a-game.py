from functools import lru_cache
from typing import List


def predict_the_winner(nums: List[int]) -> bool:
    @lru_cache(None)
    def score(i: int, j: int) -> int:
        if i > j:
            return 0
        take_left = nums[i] - score(i + 1, j)
        take_right = nums[j] - score(i, j - 1)
        return max(take_left, take_right)

    return score(0, len(nums) - 1) >= 0
