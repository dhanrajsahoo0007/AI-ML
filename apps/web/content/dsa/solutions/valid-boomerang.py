from typing import List


def is_boomerang(p1: List[int], p2: List[int], p3: List[int]) -> bool:
    if p1 == p2 or p2 == p3 or p1 == p3:
        return False
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)
    return cross != 0
