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

    def equationsPossible(self, equations: List[str]) -> bool:
        self.parent = list(range(26))
        self.rank = [0] * 26

        for eq in equations:
            if eq[1] == "=":
                x = ord(eq[0]) - ord("a")
                y = ord(eq[3]) - ord("a")
                self.union(x, y)

        for eq in equations:
            if eq[1] == "!":
                x = ord(eq[0]) - ord("a")
                y = ord(eq[3]) - ord("a")
                if self.find(x) == self.find(y):
                    return False

        return True
