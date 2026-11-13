from typing import List
from collections import deque


def eventual_safe_nodes(graph: List[List[int]]) -> List[int]:
    n = len(graph)
    rev: List[List[int]] = [[] for _ in range(n)]
    indegree = [0] * n
    for u, nbrs in enumerate(graph):
        indegree[u] = len(nbrs)
        for v in nbrs:
            rev[v].append(u)
    q: deque[int] = deque(i for i in range(n) if indegree[i] == 0)
    safe = [False] * n
    while q:
        u = q.popleft()
        safe[u] = True
        for v in rev[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return [i for i in range(n) if safe[i]]
