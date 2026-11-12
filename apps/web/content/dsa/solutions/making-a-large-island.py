from typing import List


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n
        self.number_of_components = n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        x_parent, y_parent = self.find(x), self.find(y)
        if x_parent == y_parent:
            return

        if self.size[x_parent] > self.size[y_parent]:
            self.parent[y_parent] = x_parent
            self.size[x_parent] += self.size[y_parent]
        else:
            self.parent[x_parent] = y_parent
            self.size[y_parent] += self.size[x_parent]

        self.number_of_components -= 1


def largest_island(grid: List[List[int]]) -> int:
    n = len(grid)
    dsu = DSU(n * n)

    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    def is_valid(x: int, y: int) -> bool:
        return 0 <= x < n and 0 <= y < n

    for i in range(n):
        for j in range(n):
            if grid[i][j] == 1:
                for dx, dy in directions:
                    ni, nj = i + dx, j + dy
                    if is_valid(ni, nj) and grid[ni][nj] == 1:
                        dsu.union(i * n + j, ni * n + nj)

    max_size = max(dsu.size) if n else 0

    for i in range(n):
        for j in range(n):
            if grid[i][j] == 0:
                neighbor_roots: set[int] = set()
                for dx, dy in directions:
                    ni, nj = i + dx, j + dy
                    if is_valid(ni, nj) and grid[ni][nj] == 1:
                        neighbor_roots.add(dsu.find(ni * n + nj))

                size = 1
                for root in neighbor_roots:
                    size += dsu.size[root]

                max_size = max(max_size, size)

    return max_size
