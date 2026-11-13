from functools import lru_cache
from typing import List


def stone_game_vii(stones: List[int]) -> int:
    pre = [0]
    for x in stones:
        pre.append(pre[-1] + x)

    def seg(i: int, j: int) -> int:
        return pre[j + 1] - pre[i]

    @lru_cache(None)
    def dfs(i: int, j: int) -> int:
        if i == j:
            return 0
        left = seg(i + 1, j) - dfs(i + 1, j)
        right = seg(i, j - 1) - dfs(i, j - 1)
        return max(left, right)

    return dfs(0, len(stones) - 1)
