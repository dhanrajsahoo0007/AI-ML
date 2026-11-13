from collections import defaultdict
from typing import Dict, List


def subarrays_with_k_distinct(nums: List[int], k: int) -> int:
    def at_most(distinct_limit: int) -> int:
        freq: Dict[int, int] = defaultdict(int)
        left = 0
        total = 0

        for right, value in enumerate(nums):
            freq[value] += 1

            while len(freq) > distinct_limit:
                freq[nums[left]] -= 1
                if freq[nums[left]] == 0:
                    del freq[nums[left]]
                left += 1

            total += right - left + 1

        return total

    return at_most(k) - at_most(k - 1)
