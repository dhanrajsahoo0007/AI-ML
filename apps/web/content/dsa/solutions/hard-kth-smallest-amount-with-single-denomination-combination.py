from math import gcd
from typing import List


def find_kth_smallest(coins: List[int], k: int) -> int:
    n = len(coins)

    def count_leq(x: int) -> int:
        total = 0
        for mask in range(1, 1 << n):
            bits = bin(mask).count("1")
            l = 1
            for i in range(n):
                if mask >> i & 1:
                    l = l * coins[i] // gcd(l, coins[i])
            c = x // l
            if bits % 2 == 1:
                total += c
            else:
                total -= c
        return total

    lo = min(coins)
    hi = lo
    while count_leq(hi) < k:
        hi *= 2
    while lo < hi:
        mid = (lo + hi) // 2
        if count_leq(mid) >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo
