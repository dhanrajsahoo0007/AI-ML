import math
from typing import List


def minmax_gas_dist(stations: List[int], k: int) -> float:
    gaps = [stations[i + 1] - stations[i] for i in range(len(stations) - 1)]
    lo, hi = 1e-9, max(gaps)

    def need(d: float) -> int:
        return sum(max(0, math.ceil(g / d) - 1) for g in gaps)

    for _ in range(60):
        mid = (lo + hi) / 2
        if need(mid) <= k:
            hi = mid
        else:
            lo = mid
    return hi


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def minmax_gas_dist_tests(a0, a1):  # the entry the tests call
    result = minmax_gas_dist(a0, a1)
    result = _rounded(result)
    return result
