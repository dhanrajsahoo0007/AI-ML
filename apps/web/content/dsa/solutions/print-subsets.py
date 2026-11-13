from typing import List


def subsequences(s: str) -> List[str]:
    result: List[str] = []

    def dfs(index: int, built: str) -> None:
        if index == len(s):
            if built:
                result.append(built)
            return
        dfs(index + 1, built + s[index])
        dfs(index + 1, built)

    dfs(0, "")
    return result


# --- Glue (same as the starter) ---

def subsequences_tests(a0):  # the entry the tests call
    result = subsequences(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
