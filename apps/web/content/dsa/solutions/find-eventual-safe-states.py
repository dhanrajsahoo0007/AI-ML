from typing import List


def eventual_safe_nodes(graph: List[List[int]]) -> List[int]:
    n = len(graph)
    state = [0] * n

    def dfs(u: int) -> bool:
        if state[u] == 1:
            return False
        if state[u] == 2:
            return True
        state[u] = 1
        for v in graph[u]:
            if not dfs(v):
                return False
        state[u] = 2
        return True

    for i in range(n):
        dfs(i)
    return [i for i in range(n) if state[i] == 2]
