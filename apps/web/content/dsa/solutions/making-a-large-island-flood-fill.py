from typing import List


def largest_island(grid: List[List[int]]) -> int:
    n = len(grid)
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    index = 2
    area: dict[int, int] = {}

    def dfs(r: int, c: int, color: int) -> int:
        grid[r][c] = color
        cnt = 1
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 1:
                cnt += dfs(nr, nc, color)
        return cnt

    for i in range(n):
        for j in range(n):
            if grid[i][j] == 1:
                area[index] = dfs(i, j, index)
                index += 1

    ans = max(area.values(), default=0)
    for i in range(n):
        for j in range(n):
            if grid[i][j] != 0:
                continue
            seen: set[int] = set()
            cur = 1
            for dr, dc in dirs:
                ni, nj = i + dr, j + dc
                if 0 <= ni < n and 0 <= nj < n and grid[ni][nj] >= 2:
                    seen.add(grid[ni][nj])
            for comp in seen:
                cur += area[comp]
            ans = max(ans, cur)
    return ans
