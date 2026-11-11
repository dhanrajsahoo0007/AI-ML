from typing import List


def solve(board: List[List[str]]) -> List[List[str]]:
    if not board:
        return board
    m, n = len(board), len(board[0])
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(r: int, c: int) -> None:
        if r < 0 or c < 0 or r >= m or c >= n or board[r][c] != "O":
            return
        board[r][c] = "T"
        for dr, dc in dirs:
            dfs(r + dr, c + dc)

    for r in range(m):
        dfs(r, 0)
        dfs(r, n - 1)
    for c in range(n):
        dfs(0, c)
        dfs(m - 1, c)

    for r in range(m):
        for c in range(n):
            if board[r][c] == "O":
                board[r][c] = "X"
            elif board[r][c] == "T":
                board[r][c] = "O"
    return board
