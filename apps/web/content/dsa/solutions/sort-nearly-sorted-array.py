import heapq
from typing import List


def sort_nearly_sorted(arr: List[int], k: int) -> List[int]:
    n = len(arr)
    min_heap = arr[:k + 1]
    heapq.heapify(min_heap)

    result = []

    for i in range(k + 1, n):
        # Smallest in window is the next globally smallest element.
        result.append(heapq.heappop(min_heap))
        heapq.heappush(min_heap, arr[i])

    while min_heap:
        result.append(heapq.heappop(min_heap))

    return result
