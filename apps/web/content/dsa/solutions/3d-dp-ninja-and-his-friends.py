from typing import List


def cherry_pickup(grid: List[List[int]]) -> int:
    n = len(grid)
    if n == 1:
        return max(0, grid[0][0])
    neg = -10**9
    f = [[[neg] * n for _ in range(n)] for _ in range(n)]
    f[0][0][n - 1] = grid[0][0] + grid[0][n - 1]
    for r in range(n - 1):
        for a in range(n):
            for b in range(n):
                if f[r][a][b] <= neg // 2:
                    continue
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        na, nb = a + da, b + db
                        if 0 <= na < n and 0 <= nb < n:
                            add = grid[r + 1][na] + (grid[r + 1][nb] if na != nb else 0)
                            f[r + 1][na][nb] = max(f[r + 1][na][nb], f[r][a][b] + add)
    return max(0, f[n - 1][n - 1][n - 1])
