from typing import List


def find_circle_num(isConnected: List[List[int]]) -> int:
    n = len(isConnected)
    visited = [False] * n
    provinces = 0

    def dfs(u: int) -> None:
        visited[u] = True
        for v in range(n):
            if isConnected[u][v] == 1 and not visited[v]:
                dfs(v)

    for i in range(n):
        if not visited[i]:
            dfs(i)
            provinces += 1
    return provinces
