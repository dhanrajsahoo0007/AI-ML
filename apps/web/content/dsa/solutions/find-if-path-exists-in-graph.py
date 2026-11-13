from typing import List
from collections import defaultdict, deque


def valid_path(n: int, edges: List[List[int]], source: int, destination: int) -> bool:
    if source == destination:
        return True
    g = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)
    q = deque([source])
    seen = {source}
    while q:
        u = q.popleft()
        for v in g[u]:
            if v == destination:
                return True
            if v not in seen:
                seen.add(v)
                q.append(v)
    return False
