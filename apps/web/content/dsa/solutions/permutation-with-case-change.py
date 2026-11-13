from typing import List


def case_permutations(s: str) -> List[str]:
    result: List[str] = []

    def dfs(index: int, built: str) -> None:
        if index == len(s):
            result.append(built)
            return
        ch = s[index]
        if ch.isalpha():
            dfs(index + 1, built + ch.lower())
            dfs(index + 1, built + ch.upper())
        else:
            dfs(index + 1, built + ch)

    dfs(0, "")
    return sorted(result)
