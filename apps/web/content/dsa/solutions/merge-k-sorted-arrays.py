import heapq
from typing import List


def merge_k_sorted_arrays(lists: List[List[int]]) -> List[int]:
    min_heap = []
    result = []

    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(min_heap, (lst[0], i, 0))

    while min_heap:
        val, list_idx, elem_idx = heapq.heappop(min_heap)
        result.append(val)

        # Push successor from the same list (if any) to keep one pointer per list in the heap.
        if elem_idx + 1 < len(lists[list_idx]):
            next_val = lists[list_idx][elem_idx + 1]
            heapq.heappush(min_heap, (next_val, list_idx, elem_idx + 1))

    return result
