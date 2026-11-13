from typing import List


def get_maximum_gold(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dirs = ((-1, 0), (1, 0), (0, 1), (0, -1))

    def dfs(i: int, j: int) -> int:
        if i < 0 or i >= m or j < 0 or j >= n or grid[i][j] == 0:
            return 0
        gold = grid[i][j]
        grid[i][j] = 0
        best = 0
        for di, dj in dirs:
            best = max(best, dfs(i + di, j + dj))
        grid[i][j] = gold
        return gold + best

    best_overall = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] != 0:
                best_overall = max(best_overall, dfs(i, j))
    return best_overall
