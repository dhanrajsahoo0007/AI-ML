from typing import List


class Solution:
    def __init__(self) -> None:
        self.parent: List[int] = []
        self.rank: List[int] = []

    def find(self, x: int) -> int:
        if self.parent[x] == x:
            return x

        self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        x_parent = self.find(x)
        y_parent = self.find(y)

        if x_parent == y_parent:
            return

        if self.rank[x_parent] > self.rank[y_parent]:
            self.parent[y_parent] = x_parent

        elif self.rank[x_parent] < self.rank[y_parent]:
            self.parent[x_parent] = y_parent

        else:
            self.parent[x_parent] = y_parent
            self.rank[y_parent] += 1

    def detectCycle(self, V: int, adj: List[List[int]]) -> int:
        self.parent = list(range(V))  # [0, 1, 2, 3, 4]
        self.rank = [0] * V  # [0, 0, 0, 0, 0]

        for u in range(V):
            for v in adj[u]:
                if u < v:  # Process each edge only once as it is undirected Graph
                    if self.find(u) == self.find(v):
                        return 1  # Cycle detected
                    self.union(u, v)
        return 0  # No cycle detected
