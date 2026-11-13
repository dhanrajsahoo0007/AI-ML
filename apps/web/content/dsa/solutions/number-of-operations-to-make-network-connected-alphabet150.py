from typing import List
from collections import defaultdict, deque


def make_connected(n: int, connections: List[List[int]]) -> int:
    if len(connections) < n - 1:
        return -1
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    extra = 0
    for a, b in connections:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra
        else:
            extra += 1
    comps = len({find(i) for i in range(n)})
    need = comps - 1
    return need if extra >= need else -1
