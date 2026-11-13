from typing import List


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> int:
        x_parent = self.find(x)
        y_parent = self.find(y)

        if x_parent == y_parent:
            return self.size[x_parent]

        if self.size[x_parent] > self.size[y_parent]:
            self.parent[y_parent] = x_parent
            self.size[x_parent] += self.size[y_parent]
            return self.size[x_parent]
        self.parent[x_parent] = y_parent
        self.size[y_parent] += self.size[x_parent]
        return self.size[y_parent]


def max_area_of_island(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dsu = DSU(m * n)
    directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    for i in range(m):
        for j in range(n):
            if grid[i][j] == 0:
                continue
            idx = i * n + j
            for di, dj in directions:
                ni, nj = i + di, j + dj
                if 0 <= ni < m and 0 <= nj < n and grid[ni][nj] == 1:
                    dsu.union(idx, ni * n + nj)

    best = 0
    seen_roots: set[int] = set()
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                r = dsu.find(i * n + j)
                if r not in seen_roots:
                    seen_roots.add(r)
                    best = max(best, dsu.size[r])
    return best
