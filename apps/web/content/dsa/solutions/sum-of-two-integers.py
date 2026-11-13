MASK = 0xFFFFFFFF
MAX_INT = 0x7FFFFFFF


def get_sum(a: int, b: int) -> int:
    while b & MASK:
        carry = ((a & b) << 1) & MASK
        a = (a ^ b) & MASK
        b = carry
    return a if a <= MAX_INT else ~(a ^ MASK)
