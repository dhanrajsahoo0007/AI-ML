from typing import List
from collections import defaultdict, deque


def min_reorder(n: int, connections: List[List[int]]) -> int:
    g = defaultdict(list)
    for a, b in connections:
        g[a].append((b, 1))
        g[b].append((a, 0))
    ans = 0
    stack = [(0, -1)]
    while stack:
        u, p = stack.pop()
        for v, needs in g[u]:
            if v == p:
                continue
            ans += needs
            stack.append((v, u))
    return ans
