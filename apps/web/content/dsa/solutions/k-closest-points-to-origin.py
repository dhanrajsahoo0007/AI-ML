import heapq
from typing import List


def k_closest(points: List[List[int]], k: int) -> List[List[int]]:
    max_heap = []

    for point in points:
        x, y = point
        # Negated squared distance → min-heap behaves like max-heap on closeness.
        dist = -(x * x + y * y)

        if len(max_heap) < k:
            heapq.heappush(max_heap, (dist, point))
        elif dist > max_heap[0][0]:
            heapq.heapreplace(max_heap, (dist, point))

    return [point for _, point in max_heap]


# --- Glue (same as the starter) ---

def k_closest_tests(a0, a1):  # the entry the tests call
    result = k_closest(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
