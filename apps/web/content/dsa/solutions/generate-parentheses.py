from typing import List


def generate_parenthesis(n: int) -> List[str]:
    result: List[str] = []

    def dfs(open_left: int, close_left: int, path: List[str]) -> None:
        if open_left == 0 and close_left == 0:
            result.append("".join(path))
            return
        if open_left > 0:
            path.append("(")
            dfs(open_left - 1, close_left, path)
            path.pop()
        if close_left > open_left:
            path.append(")")
            dfs(open_left, close_left - 1, path)
            path.pop()

    dfs(n, n, [])
    return result
