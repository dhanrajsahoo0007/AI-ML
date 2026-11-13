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

    def numberOfGoodPaths(self, vals: List[int], edges: List[List[int]]) -> int:
        n = len(vals)
        self.parent = list(range(n))
        self.rank = [0] * n

        adj: dict[int, List[int]] = {i: [] for i in range(n)}
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)

        val_to_nodes: dict[int, List[int]] = {}
        for i, value in enumerate(vals):
            val_to_nodes.setdefault(value, []).append(i)

        result = n
        is_active = [False] * n

        for value in sorted(val_to_nodes.keys()):
            nodes = val_to_nodes[value]

            for u in nodes:
                for v in adj[u]:
                    if is_active[v]:
                        self.union(u, v)
                is_active[u] = True

            parent_count: dict[int, int] = {}
            for u in nodes:
                parent = self.find(u)
                parent_count[parent] = parent_count.get(parent, 0) + 1

            for count in parent_count.values():
                result += (count * (count - 1)) // 2

        return result
