from typing import List


class Solution:
    def __init__(self) -> None:
        self.parent: List[int] = []
        self.rank: List[int] = []

    def find(self, x: int) -> int:
        if x == self.parent[x]:
            return x
        self.parent[x] = self.find(self.parent[x])
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

    def countPairs(self, n: int, edges: List[List[int]]) -> int:
        self.parent = list(range(n))
        self.rank = [0] * n

        for u, v in edges:
            self.union(u, v)

        component_sizes: dict[int, int] = {}
        for i in range(n):
            parent = self.find(i)
            component_sizes[parent] = component_sizes.get(parent, 0) + 1

        result = 0
        remaining_nodes = n

        for size in component_sizes.values():
            result += size * (remaining_nodes - size)
            remaining_nodes -= size

        return result
