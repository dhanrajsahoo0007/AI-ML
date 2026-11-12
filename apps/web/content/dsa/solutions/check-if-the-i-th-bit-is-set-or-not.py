def is_bit_set(n: int, i: int) -> bool:
    return ((n >> i) & 1) == 1
