from typing import List


def floor(nums: List[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    best = -1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return nums[mid]
        if nums[mid] < target:
            best = nums[mid]
            left = mid + 1
        else:
            right = mid - 1
    return best
