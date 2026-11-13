from copy import deepcopy
from typing import List


def exist(board: List[List[str]], word: str) -> bool:
    m, n = len(board), len(board[0])
    dirs = ((0, 1), (0, -1), (1, 0), (-1, 0))

    def dfs(r: int, c: int, idx: int) -> bool:
        if idx == len(word):
            return True
        if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != word[idx]:
            return False
        temp = board[r][c]
        board[r][c] = "#"
        for dr, dc in dirs:
            if dfs(r + dr, c + dc, idx + 1):
                board[r][c] = temp
                return True
        board[r][c] = temp
        return False

    if m * n < len(word):
        return False
    for r in range(m):
        for c in range(n):
            if board[r][c] == word[0] and dfs(r, c, 0):
                return True
    return False
