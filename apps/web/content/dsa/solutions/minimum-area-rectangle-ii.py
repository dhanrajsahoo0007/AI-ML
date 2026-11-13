import math
from typing import List, Set, Tuple


def min_area_free_rect(points: List[List[int]]) -> float:
    pset: Set[Tuple[int, int]] = {(x, y) for x, y in points}
    n = len(points)
    best = float("inf")
    for i in range(n):
        x1, y1 = points[i]
        for j in range(n):
            if i == j:
                continue
            x2, y2 = points[j]
            dx1, dy1 = x2 - x1, y2 - y1
            for k in range(n):
                if k in (i, j):
                    continue
                x3, y3 = points[k]
                dx2, dy2 = x3 - x1, y3 - y1
                if dx1 * dx2 + dy1 * dy2 != 0:
                    continue
                x4, y4 = x2 + x3 - x1, y2 + y3 - y1
                if (x4, y4) in pset:
                    area = math.hypot(dx1, dy1) * math.hypot(dx2, dy2)
                    best = min(best, area)
    return 0.0 if best == float("inf") else best


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def min_area_free_rect_tests(a0):  # the entry the tests call
    result = min_area_free_rect(a0)
    result = _rounded(result)
    return result
