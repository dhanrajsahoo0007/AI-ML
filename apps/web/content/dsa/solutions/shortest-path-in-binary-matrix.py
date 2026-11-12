from typing import List
import heapq


def shortest_path_binary_matrix(grid: List[List[int]]) -> int:
    n = len(grid)
    if grid[0][0] == 1 or grid[n - 1][n - 1] == 1:
        return -1
    if n == 1:
        return 1

    directions = (
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (1, 1), (1, -1), (-1, 1), (-1, -1),
    )
    dist = [[10**9] * n for _ in range(n)]
    dist[0][0] = 1
    heap = [(1, 0, 0)]

    while heap:
        d, r, c = heapq.heappop(heap)
        if d != dist[r][c]:
            continue
        if r == n - 1 and c == n - 1:
            return d
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 0:
                nd = d + 1
                if nd < dist[nr][nc]:
                    dist[nr][nc] = nd
                    heapq.heappush(heap, (nd, nr, nc))
    return -1
