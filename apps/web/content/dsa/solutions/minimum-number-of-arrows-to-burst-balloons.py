from typing import List


def find_min_arrow_shots(points: List[List[int]]) -> int:
    if not points:
        return 0

    points.sort(key=lambda p: p[0])
    arrows = 1
    arrow_lo, arrow_hi = points[0]

    for start, end in points[1:]:
        if start > arrow_hi:
            arrows += 1
            arrow_lo, arrow_hi = start, end
        else:
            arrow_lo = max(arrow_lo, start)
            arrow_hi = min(arrow_hi, end)

    return arrows


class BalloonMerger:
    """Counts arrows by repeatedly merging overlapping neighbors (original classroom version)."""

    def findMinArrowShots(self, points: List[List[int]]) -> int:
        if not points:
            return 0
        points.sort()
        res = len(points)
        prev = points[0]
        for curr in points[1:]:
            if curr[0] <= prev[1]:
                res -= 1
                prev = [curr[0], min(curr[1], prev[1])]
            else:
                prev = curr
        return res
