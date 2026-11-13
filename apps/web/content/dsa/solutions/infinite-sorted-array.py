from typing import List


def search(nums: List[int], target: int) -> int:
    if not nums:
        return -1
    left, right = 0, 1
    n = len(nums)
    while right < n and nums[right] < target:
        left = right
        right *= 2
    lo, hi = left, min(right, n - 1)
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
