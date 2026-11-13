def minimum_time_to_initial_state(word: str, k: int) -> int:
    n = len(word)
    if k >= n:
        return 1
    z = _z_function(word)
    for pos in range(k, n, k):
        if z[pos] >= n - pos:
            return pos // k
    return (n + k - 1) // k


def _z_function(s: str) -> list[int]:
    n = len(s)
    z = [0] * n
    left = 0
    right = 0
    for i in range(1, n):
        if i <= right:
            z[i] = min(right - i + 1, z[i - left])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] - 1 > right:
            left, right = i, i + z[i] - 1
    return z
