import heapq
from typing import List


def kth_largest_in_n_arrays(arrays: List[List[int]], k: int) -> int:
    max_heap = []

    for i, arr in enumerate(arrays):
        if arr:
            heapq.heappush(max_heap, (-arr[0], i, 0))

    for _ in range(k - 1):
        _, array_idx, elem_idx = heapq.heappop(max_heap)

        # Extend the winning array's pointer — its next value is the next candidate "largest".
        if elem_idx + 1 < len(arrays[array_idx]):
            next_val = arrays[array_idx][elem_idx + 1]
            heapq.heappush(max_heap, (-next_val, array_idx, elem_idx + 1))

    return -max_heap[0][0]
