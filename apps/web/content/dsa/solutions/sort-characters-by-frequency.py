import heapq
from collections import Counter


def frequency_sort(s: str) -> str:
    freq = Counter(s)
    heap = [(-count, char) for char, count in freq.items()]
    heapq.heapify(heap)

    result = []
    while heap:
        count, char = heapq.heappop(heap)
        result.append(char * (-count))

    return "".join(result)
