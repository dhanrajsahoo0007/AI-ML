from typing import List


def min_time_to_visit_all_points(points: List[List[int]]) -> int:
    t = 0
    for i in range(1, len(points)):
        dx = abs(points[i][0] - points[i - 1][0])
        dy = abs(points[i][1] - points[i - 1][1])
        t += max(dx, dy)
    return t
