from typing import List


class Solution:
    def __init__(self) -> None:
        self.parent: List[int] = []
        self.rank: List[int] = []

    def reset(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

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

    def count_components(self, n: int, unions: List[List[int]]) -> int:
        self.reset(n)
        for a, b in unions:
            self.union(a, b)
        return len({self.find(i) for i in range(n)})
