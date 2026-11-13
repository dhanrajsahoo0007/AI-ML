from typing import List


def generate_parenthesis(n: int) -> List[str]:
    result: List[str] = []

    def dfs(open_used: int, close_used: int, path: str) -> None:
        if open_used == n and close_used == n:
            result.append(path)
            return
        if open_used < n:
            dfs(open_used + 1, close_used, path + "(")
        if close_used < open_used:
            dfs(open_used, close_used + 1, path + ")")

    dfs(0, 0, "")
    return result
