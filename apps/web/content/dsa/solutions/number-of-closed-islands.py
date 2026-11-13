from typing import List


def closed_island(grid: List[List[int]]) -> int:
    if not grid or not grid[0]:
        return 0

    row_len = len(grid)
    col_len = len(grid[0])
    DIRECTIONS = [(1, 0), (-1, 0), (0, -1), (0, 1)]

    visited = [[0 for _ in range(col_len)] for _ in range(row_len)]

    def dfs(row: int, col: int) -> bool:
        if row < 0 or col < 0 or row >= row_len or col >= col_len:
            return False
        # Did not understand
        if grid[row][col] == 1 or visited[row][col] == 1:
            return True
        visited[row][col] = 1
        is_closed = True
        for x, y in DIRECTIONS:
            nrow = row + x
            ncol = col + y
            is_closed &= dfs(nrow, ncol)
        return is_closed

    closed_islands = 0
    for row in range(row_len):
        for col in range(col_len):
            if grid[row][col] == 0 and not visited[row][col]:
                if dfs(row, col):
                    closed_islands += 1
    return closed_islands
