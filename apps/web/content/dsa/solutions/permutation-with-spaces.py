from typing import List


def permute_with_spaces(s: str) -> List[str]:
    if not s:
        return []
    result: List[str] = []

    def dfs(index: int, current: str) -> None:
        if index == len(s) - 1:
            result.append(current + s[index])
            return
        dfs(index + 1, current + s[index])
        dfs(index + 1, current + s[index] + " ")

    dfs(0, "")
    return result
