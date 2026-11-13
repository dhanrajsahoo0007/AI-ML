from typing import List
from collections import defaultdict, deque


def nearest_exit(maze: List[List[str]], entrance: List[int]) -> int:
    m, n = len(maze), len(maze[0])
    er, ec = entrance
    q = deque([(er, ec, 0)])
    vis = {(er, ec)}
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1))

    while q:
        r, c, d = q.popleft()
        if (r in (0, m - 1) or c in (0, n - 1)) and (r, c) != (er, ec):
            return d
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and maze[nr][nc] == "." and (nr, nc) not in vis:
                vis.add((nr, nc))
                q.append((nr, nc, d + 1))
    return -1
