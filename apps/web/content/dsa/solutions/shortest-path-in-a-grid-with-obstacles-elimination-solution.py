from typing import List
from collections import defaultdict, deque


def shortest_path(grid: List[List[int]], k: int) -> int:
    m, n = len(grid), len(grid[0])
    dist = [[[float("inf")] * (k + 1) for _ in range(n)] for _ in range(m)]
    q = deque([(0, 0, 0, 0)])
    dist[0][0][0] = 0
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1))

    while q:
        steps, r, c, obs = q.popleft()
        if steps > dist[r][c][obs]:
            continue
        if r == m - 1 and c == n - 1:
            return steps
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < m and 0 <= nc < n):
                continue
            no = obs + grid[nr][nc]
            if no > k:
                continue
            if steps + 1 < dist[nr][nc][no]:
                dist[nr][nc][no] = steps + 1
                q.append((steps + 1, nr, nc, no))
    return -1
