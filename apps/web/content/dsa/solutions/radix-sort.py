from typing import List


def radix_sort(nums: List[int]) -> List[int]:
    if not nums:
        return []
    m = max(nums)
    exp = 1
    out = list(nums)
    while m // exp > 0:
        buckets: List[List[int]] = [[] for _ in range(10)]
        for x in out:
            buckets[(x // exp) % 10].append(x)
        out = [x for b in buckets for x in b]
        exp *= 10
    return out
