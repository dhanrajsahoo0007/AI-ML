from typing import List


def bucket_sort(nums: List[float]) -> List[float]:
    n = len(nums)
    if n <= 1:
        return list(nums)
    buckets: List[List[float]] = [[] for _ in range(n)]
    for x in nums:
        idx = min(n - 1, int(x * n))
        buckets[idx].append(x)
    for b in buckets:
        b.sort()
    out: List[float] = []
    for b in buckets:
        out.extend(b)
    return out


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def bucket_sort_tests(a0):  # the entry the tests call
    result = bucket_sort(a0)
    result = _rounded(result)
    return result
