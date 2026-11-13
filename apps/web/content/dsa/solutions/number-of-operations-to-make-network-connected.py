from typing import List


class Solution:
    def __init__(self) -> None:
        self.parent: List[int] = []
        self.rank: List[int] = []

    def find(self, x: int) -> int:
        if x == self.parent[x]:
            return x
        self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        x_parent = self.find(x)
        y_parent = self.find(y)

        if x_parent == y_parent:
            return

        # Union by rank
        if self.rank[x_parent] > self.rank[y_parent]:
            self.parent[y_parent] = x_parent
        elif self.rank[x_parent] < self.rank[y_parent]:
            self.parent[x_parent] = y_parent
        else:
            self.parent[x_parent] = y_parent
            self.rank[y_parent] += 1

    def makeConnected(self, n: int, connections: List[List[int]]) -> int:
        if len(connections) < n - 1:
            return -1

        self.parent = list(range(n))
        self.rank = [0] * n

        components = n
        for u, v in connections:
            if self.find(u) != self.find(v):
                components -= 1
                self.union(u, v)

        return components - 1
