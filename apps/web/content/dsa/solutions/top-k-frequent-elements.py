import heapq
from collections import Counter
from typing import List


def top_k_frequent(nums: List[int], k: int) -> List[int]:
    count = Counter(nums)
    heap = []

    for num, freq in count.items():
        if len(heap) < k:
            heapq.heappush(heap, (freq, num))
        elif freq > heap[0][0]:
            # Replace the least frequent of our top-k candidates.
            heapq.heapreplace(heap, (freq, num))

    return [num for freq, num in heap]


# --- Glue (same as the starter) ---

def top_k_frequent_tests(a0, a1):  # the entry the tests call
    result = top_k_frequent(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
