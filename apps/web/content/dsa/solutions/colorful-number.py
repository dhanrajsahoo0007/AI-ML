from typing import Set


def colorful(A: int) -> int:
    s = str(abs(A))
    seen: Set[int] = set()
    n = len(s)
    for i in range(n):
        prod = 1
        for j in range(i, n):
            prod *= int(s[j])
            if prod in seen:
                return 0
            seen.add(prod)
    return 1
