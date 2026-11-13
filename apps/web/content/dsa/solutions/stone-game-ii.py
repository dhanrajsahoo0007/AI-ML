from functools import lru_cache
from typing import List


def stone_game_ii(piles: List[int]) -> int:
    n = len(piles)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] + piles[i]

    @lru_cache(maxsize=None)
    def best(i: int, m: int) -> int:
        if i == n:
            return 0
        if i + 2 * m >= n:
            return suffix[i]
        res = 0
        for x in range(1, 2 * m + 1):
            res = max(res, suffix[i] - best(i + x, max(m, x)))
        return res

    return best(0, 1)
