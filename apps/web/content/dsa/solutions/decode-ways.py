def num_decodings(s: str) -> int:
    n = len(s)
    memo: dict[int, int] = {}

    def dfs(i: int) -> int:
        if i == n:
            return 1
        if i in memo:
            return memo[i]
        if s[i] == "0":
            memo[i] = 0
            return 0
        ways = dfs(i + 1)
        if i < n - 1 and 10 <= int(s[i : i + 2]) <= 26:
            ways += dfs(i + 2)
        memo[i] = ways
        return ways

    return dfs(0)
