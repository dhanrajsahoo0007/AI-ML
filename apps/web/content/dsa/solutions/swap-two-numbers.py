from typing import Tuple


def swap(a: int, b: int) -> Tuple[int, int]:
    a ^= b
    b ^= a
    a ^= b
    return a, b
