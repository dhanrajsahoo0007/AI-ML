from typing import List


def maximum_points(points: List[List[int]]) -> int:
    a, b, c = points[0]
    for i in range(1, len(points)):
        x, y, z = points[i]
        na = x + max(b, c)
        nb = y + max(a, c)
        nc = z + max(a, b)
        a, b, c = na, nb, nc
    return max(a, b, c)
