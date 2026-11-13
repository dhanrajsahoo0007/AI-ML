import heapq
from typing import List


def mincost_to_hire_workers(quality: List[int], wage: List[int], k: int) -> float:
    workers = sorted((w / q, q) for w, q in zip(wage, quality))
    qual_heap = []
    qual_sum = 0
    min_cost = float('inf')

    for ratio, q in workers:
        heapq.heappush(qual_heap, -q)
        qual_sum += q

        if len(qual_heap) > k:
            qual_sum += heapq.heappop(qual_heap)

        if len(qual_heap) == k:
            min_cost = min(min_cost, ratio * qual_sum)

    return min_cost


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def mincost_to_hire_workers_tests(a0, a1, a2):  # the entry the tests call
    result = mincost_to_hire_workers(a0, a1, a2)
    result = _rounded(result)
    return result
