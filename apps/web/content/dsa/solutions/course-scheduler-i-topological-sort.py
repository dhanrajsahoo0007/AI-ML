from typing import List
from collections import defaultdict, deque


def can_finish(numCourses: int, prerequisites: List[List[int]]) -> bool:
    adj = defaultdict(list)
    indegree = [0] * numCourses
    for a, b in prerequisites:
        adj[b].append(a)
        indegree[a] += 1
    q: deque[int] = deque(i for i in range(numCourses) if indegree[i] == 0)
    count = 0
    while q:
        u = q.popleft()
        count += 1
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)
    return count == numCourses
