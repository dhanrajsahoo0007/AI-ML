from typing import List


def minimize_max(nums: List[int], p: int) -> int:
    if p == 0:
        return 0
    nums = sorted(nums)

    def count_pairs(limit: int) -> int:
        i = 0
        c = 0
        n = len(nums)
        while i < n - 1:
            if nums[i + 1] - nums[i] <= limit:
                c += 1
                i += 2
            else:
                i += 1
        return c

    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if count_pairs(mid) >= p:
            hi = mid
        else:
            lo = mid + 1
    return lo
