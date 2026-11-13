import heapq
from collections import Counter
from typing import List


def is_possible_divide(nums: List[int], k: int) -> bool:
    if len(nums) % k != 0:
        return False

    counts = Counter(nums)
    heap = list(counts.keys())
    heapq.heapify(heap)

    while heap:
        start = heap[0]
        for num in range(start, start + k):
            if num not in counts:
                return False
            counts[num] -= 1
            if counts[num] == 0:
                if num != heap[0]:
                    return False
                heapq.heappop(heap)

    return True
