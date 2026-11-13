from typing import List
from collections import deque


def largest_path_value(colors: str, edges: List[List[int]]) -> int:
    n = len(colors)
    g = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        g[u].append(v)
        indeg[v] += 1
    dp = [[0] * 26 for _ in range(n)]
    for i in range(n):
        dp[i][ord(colors[i]) - ord("a")] = 1
    q: deque[int] = deque(i for i in range(n) if indeg[i] == 0)
    seen = 0
    best = 0
    while q:
        u = q.popleft()
        seen += 1
        for v in g[u]:
            for c in range(26):
                add = 1 if ord(colors[v]) - ord("a") == c else 0
                dp[v][c] = max(dp[v][c], dp[u][c] + add)
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
        best = max(best, max(dp[u]))
    return -1 if seen < n else best
