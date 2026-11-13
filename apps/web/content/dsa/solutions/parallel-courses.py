from typing import List
from collections import defaultdict, deque


def minimum_semesters(n: int, relations: List[List[int]]) -> int:
    g = defaultdict(list)
    indeg = [0] * (n + 1)
    for u, v in relations:
        g[u].append(v)
        indeg[v] += 1
    q: deque[int] = deque(i for i in range(1, n + 1) if indeg[i] == 0)
    semesters = 0
    taken = 0
    while q:
        semesters += 1
        for _ in range(len(q)):
            u = q.popleft()
            taken += 1
            for v in g[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
    return semesters if taken == n else -1
