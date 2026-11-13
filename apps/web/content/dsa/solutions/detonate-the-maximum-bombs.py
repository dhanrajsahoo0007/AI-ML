from typing import List


def maximum_detonation(bombs: List[List[int]]) -> int:
    n = len(bombs)
    adj: List[List[int]] = [[] for _ in range(n)]

    def in_range(i: int, j: int) -> bool:
        x1, y1, r = bombs[i]
        x2, y2, _ = bombs[j]
        dx, dy = x1 - x2, y1 - y2
        return dx * dx + dy * dy <= r * r

    for i in range(n):
        for j in range(n):
            if i != j and in_range(i, j):
                adj[i].append(j)

    def dfs(u: int, seen: List[bool]) -> int:
        seen[u] = True
        cnt = 1
        for v in adj[u]:
            if not seen[v]:
                cnt += dfs(v, seen)
        return cnt

    best = 0
    for i in range(n):
        best = max(best, dfs(i, [False] * n))
    return best
