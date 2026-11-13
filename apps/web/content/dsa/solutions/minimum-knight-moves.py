from typing import List
from collections import defaultdict, deque


def min_knight_moves(x: int, y: int) -> int:
    x, y = abs(x), abs(y)
    q = deque([(0, 0, 0)])
    vis = {(0, 0)}
    moves = ((2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2))
    while q:
        i, j, d = q.popleft()
        if i == x and j == y:
            return d
        for di, dj in moves:
            ni, nj = i + di, j + dj
            if ni < -2 or nj < -2 or ni > x + 2 or nj > y + 2:
                continue
            if (ni, nj) not in vis:
                vis.add((ni, nj))
                q.append((ni, nj, d + 1))
    return -1
