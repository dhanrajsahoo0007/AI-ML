def number_of_patterns(m: int, n: int) -> int:
    skip = [[0] * 10 for _ in range(10)]
    pairs = [
        (1, 3, 2),
        (1, 7, 4),
        (1, 9, 5),
        (2, 8, 5),
        (3, 7, 5),
        (3, 9, 6),
        (4, 6, 5),
        (7, 9, 8),
    ]
    for a, b, mid in pairs:
        skip[a][b] = skip[b][a] = mid

    def dfs(visited: int, last: int, count: int) -> int:
        total = 0
        if count >= m:
            total += 1
        if count == n:
            return total
        for nxt in range(1, 10):
            bit = 1 << nxt
            if visited & bit:
                continue
            mid = skip[last][nxt]
            if mid and not (visited & (1 << mid)):
                continue
            total += dfs(visited | bit, nxt, count + 1)
        return total

    ans = 0
    for start in range(1, 10):
        ans += dfs(1 << start, start, 1)
    return ans
