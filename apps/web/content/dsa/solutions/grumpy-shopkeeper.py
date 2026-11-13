from typing import List


def max_satisfied(customers: List[int], grumpy: List[int], minutes: int) -> int:
    base = sum(c for c, g in zip(customers, grumpy) if g == 0)

    recover = [c if g == 1 else 0 for c, g in zip(customers, grumpy)]
    window = sum(recover[:minutes])
    extra = window

    for i in range(minutes, len(recover)):
        window += recover[i] - recover[i - minutes]
        extra = max(extra, window)

    return base + extra
