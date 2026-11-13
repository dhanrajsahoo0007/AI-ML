import heapq
from collections import Counter
from typing import List


def frequency_sort(nums: List[int]) -> List[int]:
    counter = Counter(nums)
    min_heap = []
    result = []

    for num, freq in counter.items():
        # Same freq → sort values descending → push (-num) before stable num field.
        heapq.heappush(min_heap, (freq, -num, num))

    while min_heap:
        freq, _, num = heapq.heappop(min_heap)
        result.extend([num] * freq)

    return result
