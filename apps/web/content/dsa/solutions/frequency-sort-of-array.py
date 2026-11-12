import heapq
from collections import Counter
from typing import List


def frequency_sort(nums: List[int]) -> List[int]:
    counter = Counter(nums)
    min_heap = []
    result = []

    for num, freq in counter.items():
        # -num breaks ties: higher value first when frequencies match.
        heapq.heappush(min_heap, (freq, -num))

    while min_heap:
        freq, neg_num = heapq.heappop(min_heap)
        result.extend([-neg_num] * freq)

    return result
