from typing import List, Set


def unique_subsequences(s: str) -> List[str]:
    found: Set[str] = set()

    def dfs(index: int, built: str) -> None:
        if index == len(s):
            found.add(built)
            return
        dfs(index + 1, built + s[index])
        dfs(index + 1, built)

    dfs(0, "")
    return sorted(found)
