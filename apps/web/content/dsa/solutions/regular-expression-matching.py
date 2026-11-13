from functools import lru_cache


def is_match(s: str, p: str) -> bool:
    @lru_cache(maxsize=None)
    def dfs(i: int, j: int) -> bool:
        if j == len(p):
            return i == len(s)
        look_ahead_star = j + 1 < len(p) and p[j + 1] == "*"
        if look_ahead_star:
            if dfs(i, j + 2):
                return True
            if i < len(s) and (p[j] == s[i] or p[j] == "."):
                return dfs(i + 1, j)
            return False
        if i < len(s) and (p[j] == s[i] or p[j] == "."):
            return dfs(i + 1, j + 1)
        return False

    return dfs(0, 0)
