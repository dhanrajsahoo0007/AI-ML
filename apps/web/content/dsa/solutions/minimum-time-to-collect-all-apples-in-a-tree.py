from typing import List
from collections import defaultdict, deque


def min_time(n: int, edges: List[List[int]], hasApple: List[bool]) -> int:
    g = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)

    def dfs(u: int, p: int) -> int:
        t = 0
        for v in g[u]:
            if v == p:
                continue
            sub = dfs(v, u)
            if sub > 0 or hasApple[v]:
                t += sub + 2
        return t

    return dfs(0, -1)
