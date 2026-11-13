from typing import List


def unique_paths_iii(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    todo = 0
    sr = sc = 0
    for r in range(m):
        for c in range(n):
            v = grid[r][c]
            if v != -1:
                todo += 1
            if v == 1:
                sr, sc = r, c

    def dfs(r: int, c: int, remaining: int) -> int:
        if not (0 <= r < m and 0 <= c < n) or grid[r][c] == -1:
            return 0
        if grid[r][c] == 2:
            return 1 if remaining == 1 else 0
        saved = grid[r][c]
        grid[r][c] = -1
        total = (
            dfs(r + 1, c, remaining - 1)
            + dfs(r - 1, c, remaining - 1)
            + dfs(r, c + 1, remaining - 1)
            + dfs(r, c - 1, remaining - 1)
        )
        grid[r][c] = saved
        return total

    return dfs(sr, sc, todo)
