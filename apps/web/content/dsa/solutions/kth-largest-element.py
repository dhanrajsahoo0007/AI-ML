import heapq
from typing import List


def find_kth_largest(nums: List[int], k: int) -> int:
    min_heap = nums[:k]
    heapq.heapify(min_heap)

    for i in range(k, len(nums)):
        # Anything smaller than the k-th-so-far can be ignored.
        if nums[i] > min_heap[0]:
            heapq.heapreplace(min_heap, nums[i])

    return min_heap[0]
