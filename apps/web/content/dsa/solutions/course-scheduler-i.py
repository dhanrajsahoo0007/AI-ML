from typing import List
from collections import defaultdict


def can_finish(numCourses: int, prerequisites: List[List[int]]) -> bool:
    adj = defaultdict(list)
    for a, b in prerequisites:
        adj[b].append(a)

    state = [0] * numCourses  # 0 unvisited, 1 visiting, 2 done

    def dfs(u: int) -> bool:
        state[u] = 1
        for v in adj[u]:
            if state[v] == 1:
                return False
            if state[v] == 0 and not dfs(v):
                return False
        state[u] = 2
        return True

    for i in range(numCourses):
        if state[i] == 0 and not dfs(i):
            return False
    return True
