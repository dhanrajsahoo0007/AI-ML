from typing import List


def check_straight_line(coordinates: List[List[int]]) -> bool:
    (x0, y0), (x1, y1) = coordinates[0], coordinates[1]
    dx0, dy0 = x1 - x0, y1 - y0
    for x, y in coordinates[2:]:
        if (x - x0) * dy0 != (y - y0) * dx0:
            return False
    return True
