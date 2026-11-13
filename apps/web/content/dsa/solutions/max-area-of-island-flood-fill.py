from typing import List


def max_area_of_island(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(r: int, c: int) -> int:
        if r < 0 or c < 0 or r >= m or c >= n or grid[r][c] == 0:
            return 0
        grid[r][c] = 0
        return 1 + sum(dfs(r + dr, c + dc) for dr, dc in dirs)

    best = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                best = max(best, dfs(i, j))
    return best
