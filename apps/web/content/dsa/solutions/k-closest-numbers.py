import heapq
from typing import List


def find_closest_elements(numbers: List[int], target: int, k: int) -> List[int]:
    max_heap = []

    for num in numbers:
        diff = abs(num - target)

        if len(max_heap) < k:
            heapq.heappush(max_heap, (-diff, num))
        elif diff < -max_heap[0][0]:
            # Current number is closer than the farthest among our k picks.
            heapq.heapreplace(max_heap, (-diff, num))

    result = [num for _, num in max_heap]
    return sorted(result)
