from typing import List


def smallest_distance_pair(nums: List[int], k: int) -> int:
    nums.sort()
    n = len(nums)

    def count_leq(limit: int) -> int:
        cnt = 0
        j = 0
        for i in range(n):
            while j < n and nums[j] - nums[i] <= limit:
                j += 1
            cnt += j - i - 1
        return cnt

    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = (lo + hi) // 2
        if count_leq(mid) >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


# --- Glue (same as the starter) ---

def smallest_distance_pair_tests(a0, a1):  # the entry the tests call
    result = smallest_distance_pair(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
