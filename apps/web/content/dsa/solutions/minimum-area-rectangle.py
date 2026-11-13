from collections import defaultdict
from typing import Dict, List, Tuple


def min_area_rect(points: List[List[int]]) -> int:
    cols: dict[int, List[int]] = defaultdict(list)
    for x, y in points:
        cols[x].append(y)
    for x in cols:
        cols[x].sort()
    last_x: Dict[Tuple[int, int], int] = {}
    best = float("inf")
    for x in sorted(cols):
        ys = cols[x]
        for i, y2 in enumerate(ys):
            for y1 in ys[:i]:
                pair = (y1, y2)
                if pair in last_x:
                    best = min(best, (x - last_x[pair]) * abs(y2 - y1))
                last_x[pair] = x
    return int(best) if best < float("inf") else 0


# --- Glue (same as the starter) ---

def min_area_rect_tests(a0):  # the entry the tests call
    result = min_area_rect(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
