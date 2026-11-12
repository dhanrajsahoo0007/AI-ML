from typing import List


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n + 1))
        self.rank = [0] * (n + 1)
        self.components = n

    def find(self, x: int) -> int:
        if x != self.parent[x]:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        x_parent, y_parent = self.find(x), self.find(y)
        if x_parent == y_parent:
            return False
        if self.rank[x_parent] < self.rank[y_parent]:
            self.parent[x_parent] = y_parent
        elif self.rank[x_parent] > self.rank[y_parent]:
            self.parent[y_parent] = x_parent
        else:
            self.parent[x_parent] = y_parent
            self.rank[y_parent] += 1
        self.components -= 1
        return True

    def is_single(self) -> bool:
        return self.components == 1


def max_num_edges_to_remove(n: int, edges: List[List[int]]) -> int:
    edges.sort(key=lambda x: x[0], reverse=True)

    alice = DSU(n)
    bob = DSU(n)
    added_edges = 0

    for edge_type, u, v in edges:
        if edge_type == 3:
            added = False
            if alice.find(u) != alice.find(v):
                alice.union(u, v)
                added = True
            if bob.find(u) != bob.find(v):
                bob.union(u, v)
                added = True
            if added:
                added_edges += 1
        elif edge_type == 2:
            if bob.find(u) != bob.find(v):
                bob.union(u, v)
                added_edges += 1
        else:
            if alice.find(u) != alice.find(v):
                alice.union(u, v)
                added_edges += 1

    if alice.is_single() and bob.is_single():
        return len(edges) - added_edges
    return -1
