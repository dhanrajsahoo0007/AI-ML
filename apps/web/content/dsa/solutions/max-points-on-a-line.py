import math
from collections import defaultdict
from typing import Dict, List, Tuple


def max_points(points: List[List[int]]) -> int:
    n = len(points)
    if n <= 2:
        return n
    best = 0

    def norm(dx: int, dy: int) -> Tuple[int, int]:
        if dx == 0 and dy == 0:
            return (0, 0)
        g = math.gcd(dx, dy)
        dx //= g
        dy //= g
        if dx < 0 or (dx == 0 and dy < 0):
            dx, dy = -dx, -dy
        return (dx, dy)

    for i in range(n):
        slopes: Dict[Tuple[int, int], int] = defaultdict(int)
        same = 1
        for j in range(n):
            if i == j:
                continue
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            if dx == 0 and dy == 0:
                same += 1
            else:
                slopes[norm(dx, dy)] += 1
        local = same
        for c in slopes.values():
            local = max(local, same + c)
        best = max(best, local)
    return best
