from typing import Dict, List


def word_break(s: str, wordDict: List[str]) -> bool:
    n = len(s)
    memo: Dict[int, bool] = {}

    def dfs(i: int) -> bool:
        if i >= n:
            return True
        if i in memo:
            return memo[i]
        for w in wordDict:
            if s.startswith(w, i) and dfs(i + len(w)):
                memo[i] = True
                return True
        memo[i] = False
        return False

    return dfs(0)
