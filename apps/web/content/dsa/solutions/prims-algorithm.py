from typing import List, Tuple
import heapq


# --- Original teaching notes (MST visualization) ---
# Imagine vertices as cities and edges as roads with tolls. Prim grows one tree from a seed:
#
#        (1)                    After picking cheapest frontier edge each time,
#      0-----1                  the set of chosen edges stays acyclic and connected.
#      |\    |                  Kruskal sorts all edges globally; Prim expands locally
#    3 | \ 2| 2                 from the current component using a min-heap "frontier".
#      |  \  |
#      2---3--3
#
# Trace (conceptual): start at 0, heap has (1,1), (3,2). Pop (1,1) -> visit 1, add 1.
# Push from 1: (2,3), (2,2). Pop (2,2) or (2,3) ... etc. Total MST weight sums popped
# light edges that lead to NEW vertices only.
# --- end visualization ---


def prim_mst_total_weight(n: int, edges: List[List[int]]) -> int:
    adj: List[List[Tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))

    visited = [False] * n
    heap: List[Tuple[int, int]] = [(0, 0)]  # (cost_to_enter, vertex)
    total = 0
    used = 0

    while heap and used < n:
        w, u = heapq.heappop(heap)
        if visited[u]:
            continue
        visited[u] = True
        total += w
        used += 1
        for v, wt in adj[u]:
            if not visited[v]:
                heapq.heappush(heap, (wt, v))

    return total if used == n else -1
