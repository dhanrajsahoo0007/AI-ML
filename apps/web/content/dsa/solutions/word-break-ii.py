from typing import List


def word_break(s: str, wordDict: List[str]) -> List[str]:
    words = set(wordDict)
    result: List[str] = []

    def dfs(start: int, path: List[str]) -> None:
        if start == len(s):
            result.append(" ".join(path))
            return
        for end in range(start + 1, len(s) + 1):
            token = s[start:end]
            if token in words:
                path.append(token)
                dfs(end, path)
                path.pop()

    dfs(0, [])
    return result


# --- Glue (same as the starter) ---

def word_break_tests(a0, a1):  # the entry the tests call
    result = word_break(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
