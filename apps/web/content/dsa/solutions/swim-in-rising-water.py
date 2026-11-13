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


def swim_in_water(grid: List[List[int]]) -> int:
    n = len(grid)
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    def can_reach_bottom_right(t: int) -> bool:
        dsu = DSU(n * n)
        for i in range(n):
            for j in range(n):
                if grid[i][j] <= t:
                    for di, dj in directions:
                        ni, nj = i + di, j + dj
                        if 0 <= ni < n and 0 <= nj < n and grid[ni][nj] <= t:
                            dsu.union(i * n + j, ni * n + nj)
        return dsu.find(0) == dsu.find(n * n - 1)

    left, right = max(grid[0][0], grid[-1][-1]), n * n - 1
    while left < right:
        mid = (left + right) // 2
        if can_reach_bottom_right(mid):
            right = mid
        else:
            left = mid + 1
    return left
