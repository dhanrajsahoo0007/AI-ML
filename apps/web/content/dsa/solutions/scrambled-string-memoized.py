from functools import lru_cache


def is_scramble(s1: str, s2: str) -> bool:
    @lru_cache(None)
    def dfs(a: str, b: str) -> bool:
        if a == b:
            return True
        if sorted(a) != sorted(b):
            return False
        n = len(a)
        for i in range(1, n):
            if (dfs(a[:i], b[:i]) and dfs(a[i:], b[i:])) or (
                dfs(a[:i], b[n - i :]) and dfs(a[i:], b[: n - i])
            ):
                return True
        return False

    return dfs(s1, s2)


# --- Glue (same as the starter) ---

def is_scramble_tests(a0, a1):  # the entry the tests call
    result = is_scramble(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
