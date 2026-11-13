from typing import List
from collections import defaultdict, deque


def min_cost_to_supply_water(n: int, wells: List[int], pipes: List[List[int]]) -> int:
    edges = []
    for i, w in enumerate(wells, start=1):
        edges.append((w, 0, i))
    for a, b, c in pipes:
        edges.append((c, a, b))
    edges.sort()
    parent = list(range(n + 1))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> bool:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[rb] = ra
        return True

    total = 0
    for w, a, b in edges:
        if union(a, b):
            total += w
    return total
