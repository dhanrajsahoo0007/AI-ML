from typing import List


def split_array(nums: List[int], k: int) -> int:
    def parts_needed(cap: int) -> int:
        s = 1
        cur = 0
        for x in nums:
            if x > cap:
                return k + 1
            if cur + x > cap:
                s += 1
                cur = x
            else:
                cur += x
            if s > k:
                return s
        return s

    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if parts_needed(mid) <= k:
            hi = mid
        else:
            lo = mid + 1
    return lo
