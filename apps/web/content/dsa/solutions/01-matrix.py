from typing import List
from collections import deque


def update_matrix(mat: List[List[int]]) -> List[List[int]]:
    if not mat:
        return mat
    rows, cols = len(mat), len(mat[0])
    dist = [[-1] * cols for _ in range(rows)]
    q: deque[tuple[int, int, int]] = deque()
    for r in range(rows):
        for c in range(cols):
            if mat[r][c] == 0:
                q.appendleft((r, c, 0))
                dist[r][c] = 0
    directions = ((-1, 0), (1, 0), (0, 1), (0, -1))
    while q:
        r, c, d = q.pop()
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if nr < 0 or nc < 0 or nr >= rows or nc >= cols:
                continue
            if dist[nr][nc] != -1:
                continue
            q.appendleft((nr, nc, d + 1))
            dist[nr][nc] = d + 1
    return dist
