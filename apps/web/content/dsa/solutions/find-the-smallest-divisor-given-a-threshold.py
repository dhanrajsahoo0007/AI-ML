import math
from typing import List


def smallest_divisor(nums: List[int], threshold: int) -> int:
    def total(div: int) -> int:
        return sum(math.ceil(x / div) for x in nums)

    lo, hi = 1, max(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if total(mid) <= threshold:
            hi = mid
        else:
            lo = mid + 1
    return lo
