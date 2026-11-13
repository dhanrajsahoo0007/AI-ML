from typing import List
from collections import defaultdict, deque


def minimum_time(n: int, relations: List[List[int]], time: List[int]) -> int:
    g = defaultdict(list)
    indeg = [0] * (n + 1)
    for x, y in relations:
        g[x].append(y)
        indeg[y] += 1
    q: deque[int] = deque()
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        if indeg[i] == 0:
            q.append(i)
            dp[i] = time[i - 1]
    while q:
        u = q.popleft()
        for v in g[u]:
            dp[v] = max(dp[v], dp[u] + time[v - 1])
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return max(dp[1:])
