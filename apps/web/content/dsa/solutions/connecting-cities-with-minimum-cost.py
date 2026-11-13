from typing import List, Tuple
import heapq


# --- Original teaching notes ---
# Same MST objective as Kruskal; Prim is natural when you think "grow one component
# from an arbitrary root" and the graph is sparse (m ~ n).
# --- end notes ---


def minimum_cost(n: int, connections: List[List[int]]) -> int:
    adj: List[List[Tuple[int, int]]] = [[] for _ in range(n)]
    for a, b, c in connections:
        u, v = a - 1, b - 1
        adj[u].append((v, c))
        adj[v].append((u, c))

    visited = [False] * n
    heap: List[Tuple[int, int]] = [(0, 0)]
    total = 0
    count = 0

    while heap and count < n:
        w, u = heapq.heappop(heap)
        if visited[u]:
            continue
        visited[u] = True
        total += w
        count += 1
        for v, wt in adj[u]:
            if not visited[v]:
                heapq.heappush(heap, (wt, v))

    return total if count == n else -1
