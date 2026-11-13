from typing import List
from collections import defaultdict, deque


def minimum_obstacles(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dist = [[10**9] * n for _ in range(m)]
    dist[0][0] = 0
    dq = deque([(0, 0, 0)])
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1))

    while dq:
        d, r, c = dq.popleft()
        if d > dist[r][c]:
            continue
        if r == m - 1 and c == n - 1:
            return d
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                w = grid[nr][nc]
                nd = d + w
                if nd < dist[nr][nc]:
                    dist[nr][nc] = nd
                    if w == 0:
                        dq.appendleft((nd, nr, nc))
                    else:
                        dq.append((nd, nr, nc))
    return dist[m - 1][n - 1]
