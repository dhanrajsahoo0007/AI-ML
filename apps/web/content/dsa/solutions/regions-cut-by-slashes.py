from typing import List


def regions_by_slashes(grid: List[str]) -> int:
    n = len(grid)
    size = n * 3
    g = [[0] * size for _ in range(size)]
    for i in range(n):
        for j in range(n):
            base_r, base_c = i * 3, j * 3
            ch = grid[i][j]
            if ch == "/":
                g[base_r][base_c + 2] = 1
                g[base_r + 1][base_c + 1] = 1
                g[base_r + 2][base_c] = 1
            elif ch == "\\":
                g[base_r][base_c] = 1
                g[base_r + 1][base_c + 1] = 1
                g[base_r + 2][base_c + 2] = 1

    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(r: int, c: int) -> None:
        g[r][c] = 1
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size and g[nr][nc] == 0:
                dfs(nr, nc)

    regions = 0
    for r in range(size):
        for c in range(size):
            if g[r][c] == 0:
                dfs(r, c)
                regions += 1
    return regions
