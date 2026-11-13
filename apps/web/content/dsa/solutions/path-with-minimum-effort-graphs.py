from typing import List
from collections import defaultdict, deque
import heapq


def minimum_effort_path(heights: List[List[int]]) -> int:
    m, n = len(heights), len(heights[0])
    dist = [[float("inf")] * n for _ in range(m)]
    dist[0][0] = 0
    pq = [(0, 0, 0)]
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1))

    while pq:
        d, r, c = heapq.heappop(pq)
        if d > dist[r][c]:
            continue
        if r == m - 1 and c == n - 1:
            return d
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                nd = max(d, abs(heights[r][c] - heights[nr][nc]))
                if nd < dist[nr][nc]:
                    dist[nr][nc] = nd
                    heapq.heappush(pq, (nd, nr, nc))
    return dist[m - 1][n - 1]
