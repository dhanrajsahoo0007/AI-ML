from typing import List


def graph_coloring(graph: List[List[int]], m: int) -> bool:
    n = len(graph)
    colors = [0] * n

    def safe(node: int, color: int) -> bool:
        for nei in range(n):
            if graph[node][nei] == 1 and colors[nei] == color:
                return False
        return True

    def dfs(node: int) -> bool:
        if node == n:
            return True
        for c in range(1, m + 1):
            if not safe(node, c):
                continue
            colors[node] = c
            if dfs(node + 1):
                return True
            colors[node] = 0
        return False

    return dfs(0)
