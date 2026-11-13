from typing import List
from collections import defaultdict, deque


def maximum_invitations(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    match_g = [-1] * n

    def dfs(b: int, seen: List[bool]) -> bool:
        for g in range(n):
            if grid[b][g] == 0 or seen[g]:
                continue
            seen[g] = True
            if match_g[g] == -1 or dfs(match_g[g], seen):
                match_g[g] = b
                return True
        return False

    ans = 0
    for b in range(m):
        if dfs(b, [False] * n):
            ans += 1
    return ans
