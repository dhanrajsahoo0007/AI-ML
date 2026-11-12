def num_tilings(n: int) -> int:
    mod = 10**9 + 7
    if n == 1:
        return 1
    if n == 2:
        return 2
    a, b, c = 1, 1, 2
    for _ in range(3, n + 1):
        a, b, c = b, c, (2 * c + a) % mod
    return c
