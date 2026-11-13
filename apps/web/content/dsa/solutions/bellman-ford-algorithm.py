from typing import List


def bellman_ford(V: int, edges: List[List[int]], S: int) -> List[int]:
    INF = 10**18
    dist = [INF] * V
    dist[S] = 0
    for _ in range(V - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        if not updated:
            break
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return [-1]
    return [-1 if d == INF else d for d in dist]
