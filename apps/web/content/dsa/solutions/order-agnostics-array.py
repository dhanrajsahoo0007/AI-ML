from typing import List


def search(nums: List[int], target: int) -> int:
    if not nums:
        return -1
    left, right = 0, len(nums) - 1
    is_ascending = nums[left] < nums[right]
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if is_ascending:
            if target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if target > nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
    return -1
