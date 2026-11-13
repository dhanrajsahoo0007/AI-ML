def count_set_bits(n: int) -> int:
    c = 0
    while n:
        n &= n - 1
        c += 1
    return c
