import heapq
from typing import List


def find_kth_smallest(nums: List[int], k: int) -> int:
    max_heap = [-x for x in nums[:k]]
    heapq.heapify(max_heap)

    for i in range(k, len(nums)):
        # Discard values larger than our current k-th smallest candidate.
        if nums[i] < -max_heap[0]:
            heapq.heapreplace(max_heap, -nums[i])

    return -max_heap[0]
