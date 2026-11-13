import heapq
from typing import List


def last_stone_weight(stones: List[int]) -> int:
    max_heap = [-s for s in stones]
    heapq.heapify(max_heap)

    while len(max_heap) > 1:
        y = -heapq.heappop(max_heap)
        x = -heapq.heappop(max_heap)

        if x != y:
            # Larger survives with reduced weight.
            heapq.heappush(max_heap, -(y - x))

    return -max_heap[0] if max_heap else 0
