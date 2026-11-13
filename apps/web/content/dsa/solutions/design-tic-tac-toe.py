from typing import List, Optional, Tuple


class TicTacToe:
    def __init__(self, n: int, k: int) -> None:
        self.n = n
        self.k = k
        self._board: List[List[Optional[str]]] = [[None] * n for _ in range(n)]

    def play_moves(self, moves: List[Tuple[str, int, int]]) -> Optional[str]:
        for player, r, c in moves:
            self._board[r][c] = player
            if self._wins_from(r, c, player):
                return player
        return None

    def _wins_from(self, r: int, c: int, p: str) -> bool:
        n, k = self.n, self.k
        dirs = ((1, 0), (0, 1), (1, 1), (1, -1))
        for dr, dc in dirs:
            cnt = 1
            for sign in (-1, 1):
                rr, cc = r + sign * dr, c + sign * dc
                while 0 <= rr < n and 0 <= cc < n and self._board[rr][cc] == p:
                    cnt += 1
                    rr += sign * dr
                    cc += sign * dc
            if cnt >= k:
                return True
        return False
