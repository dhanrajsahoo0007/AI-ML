from typing import List


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n
        self.number_of_components = 0

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


def num_islands2(m: int, n: int, positions: List[List[int]]) -> List[int]:
    dsu = DSU(m * n)
    grid = [[0] * n for _ in range(m)]
    results: List[int] = []
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    for r, c in positions:
        if grid[r][c] == 1:
            results.append(dsu.number_of_components)
            continue

        grid[r][c] = 1
        dsu.number_of_components += 1

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                dsu.union(r * n + c, nr * n + nc)

        results.append(dsu.number_of_components)

    return results
