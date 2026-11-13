from typing import List


def num_enclaves(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(r: int, c: int) -> None:
        grid[r][c] = 0
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                dfs(nr, nc)

    for i in range(m):
        for j in (0, n - 1):
            if grid[i][j] == 1:
                dfs(i, j)
    for j in range(n):
        for i in (0, m - 1):
            if grid[i][j] == 1:
                dfs(i, j)

    return sum(sum(row) for row in grid)
