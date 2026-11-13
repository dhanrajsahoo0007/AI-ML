from collections import deque
from typing import List


def maximum_detonation(bombs: List[List[int]]) -> int:
    n = len(bombs)
    g: List[List[int]] = [[] for _ in range(n)]

    def in_range(i: int, j: int) -> bool:
        x1, y1, _ = bombs[i]
        x2, y2, _ = bombs[j]
        dx, dy = x1 - x2, y1 - y2
        r = bombs[i][2]
        return dx * dx + dy * dy <= r * r

    for i in range(n):
        for j in range(n):
            if i != j and in_range(i, j):
                g[i].append(j)

    def bfs(start: int) -> int:
        seen = {start}
        q = deque([start])
        while q:
            u = q.popleft()
            for v in g[u]:
                if v not in seen:
                    seen.add(v)
                    q.append(v)
        return len(seen)

    return max(bfs(s) for s in range(n))
