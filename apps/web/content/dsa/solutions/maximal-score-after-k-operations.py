import heapq
import math
from typing import List


def max_kelements(nums: List[int], k: int) -> int:
    max_heap = [-num for num in nums]
    heapq.heapify(max_heap)

    score = 0
    for _ in range(k):
        max_elem = -heapq.heappop(max_heap)
        score += max_elem
        # Element decays but stays eligible for future greedy picks.
        heapq.heappush(max_heap, -math.ceil(max_elem / 3))

    return score
