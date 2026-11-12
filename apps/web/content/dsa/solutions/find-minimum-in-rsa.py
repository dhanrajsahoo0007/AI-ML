from typing import List


def find_min(nums: List[int]) -> int:
    n = len(nums)
    if n == 1 or nums[0] <= nums[-1]:
        return nums[0]
    left, right = 0, n - 1
    while left <= right:
        if nums[left] <= nums[right]:
            return nums[left]
        mid = (left + right) // 2
        nxt = (mid + 1) % n
        prev = (mid - 1 + n) % n
        if nums[mid] <= nums[nxt] and nums[mid] <= nums[prev]:
            return nums[mid]
        if nums[mid] <= nums[right]:
            right = mid - 1
        elif nums[left] <= nums[mid]:
            left = mid + 1
    return nums[0]
