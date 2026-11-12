from typing import List


def ceiling(nums: List[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    best = -1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return nums[mid]
        if nums[mid] < target:
            left = mid + 1
        else:
            best = nums[mid]
            right = mid - 1
    return best
