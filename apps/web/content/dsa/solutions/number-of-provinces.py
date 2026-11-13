from typing import List


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))
        self.rank = [0] * size
        self.components = size

    def find(self, node: int) -> int:
        if self.parent[node] != node:
            self.parent[node] = self.find(self.parent[node])
        return self.parent[node]

    def union_by_rank(self, source: int, target: int) -> bool:
        psource = self.find(source)
        ptarget = self.find(target)
        if psource == ptarget:
            return False
        if self.rank[psource] > self.rank[ptarget]:
            self.parent[ptarget] = psource
        elif self.rank[psource] < self.rank[ptarget]:
            self.parent[psource] = ptarget
        else:
            self.parent[ptarget] = psource
            self.rank[psource] += 1
        self.components -= 1
        return True


def find_circle_num(isConnected: List[List[int]]) -> int:
    n = len(isConnected)
    union_finder = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if isConnected[i][j] == 1:
                union_finder.union_by_rank(i, j)
    return union_finder.components


ARCHIVED_REFERENCE_SNIPPETS = r"""
The original file contained exploratory drafts mixing DFS, BFS, and DSU inside a docstring.
Those approaches remain valid alternatives:

DFS sketch:
    seen = set()
    def dfs(p):
        for q, adj in enumerate(M[p]):
            if adj == 1 and q not in seen:
                seen.add(q); dfs(q)
    count components by launching dfs from unseen nodes.

BFS sketch:
    Use a queue per component start; expand neighbors with adj == 1.

Adjacency-list DFS (another variant):
    Build undirected adjacency, mark visited, count launches.

The production implementation in this file is the UnionFind version above.
"""
