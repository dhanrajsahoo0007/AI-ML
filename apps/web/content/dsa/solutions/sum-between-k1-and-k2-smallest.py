import heapq
from typing import List


def sum_between_k1_k2(arr: List[int], k1: int, k2: int) -> int:
    k1_smallest = _find_kth_smallest(arr, k1)
    k2_smallest = _find_kth_smallest(arr, k2)

    return sum(x for x in arr if k1_smallest < x < k2_smallest)


def _find_kth_smallest(arr: List[int], k: int) -> int:
    max_heap = [-x for x in arr[:k]]
    heapq.heapify(max_heap)

    for i in range(k, len(arr)):
        if arr[i] < -max_heap[0]:
            heapq.heapreplace(max_heap, -arr[i])

    return -max_heap[0]
