def kth_symbol(n: int, k: int) -> int:
    if n == 1:
        return 0
    half = 1 << (n - 2)
    if k <= half:
        return kth_symbol(n - 1, k)
    return 1 - kth_symbol(n - 1, k - half)
