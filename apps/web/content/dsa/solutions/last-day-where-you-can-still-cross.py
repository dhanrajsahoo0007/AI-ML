from collections import deque
from typing import List, Set, Tuple


def latest_day_to_cross(row: int, col: int, cells: List[List[int]]) -> int:
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def can_cross(mid: int) -> bool:
        blocked: Set[Tuple[int, int]] = {(cells[i][0] - 1, cells[i][1] - 1) for i in range(mid)}
        q = deque()
        seen: Set[Tuple[int, int]] = set()
        for c in range(col):
            if (0, c) not in blocked:
                q.append((0, c))
                seen.add((0, c))
        while q:
            r, c = q.popleft()
            if r == row - 1:
                return True
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if 0 <= nr < row and 0 <= nc < col and (nr, nc) not in blocked and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    q.append((nr, nc))
        return False

    lo, hi = 0, len(cells)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if can_cross(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
