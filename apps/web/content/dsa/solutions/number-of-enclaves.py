from typing import List


def num_enclaves(grid: List[List[int]]) -> int:
    if not grid or not grid[0]:
        return 0
    row_len = len(grid)
    col_len = len(grid[0])
    DIRECTIONS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    visited = [[0 for _ in range(col_len)] for _ in range(row_len)]

    def dfs(row: int, col: int) -> None:
        for x, y in DIRECTIONS:
            nrow = x + row
            ncol = y + col
            if nrow < 0 or ncol < 0 or nrow >= row_len or ncol >= col_len:
                continue
            if grid[nrow][ncol] == 0 or visited[nrow][ncol] == 1:
                continue
            visited[nrow][ncol] = 1
            dfs(nrow, ncol)

    # Boundary 1's
    for row in range(row_len):
        for col in range(col_len):
            if (
                (row == 0 or row == row_len - 1 or col == 0 or col == col_len - 1)
                and grid[row][col] == 1
                and visited[row][col] == 0
            ):
                visited[row][col] = 1
                dfs(row, col)

    # Check the number of unvisited 1's
    lands_surrounded = 0
    for row in range(row_len):
        for col in range(col_len):
            if grid[row][col] == 1 and visited[row][col] == 0:
                lands_surrounded += 1
    return lands_surrounded
