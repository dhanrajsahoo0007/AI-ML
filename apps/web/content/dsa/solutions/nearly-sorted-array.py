from typing import List


def search(nums: List[int], target: int, k: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        start = max(mid - k, 0)
        end = min(mid + k, len(nums) - 1)
        for i in range(start, end + 1):
            if nums[i] == target:
                return i
        if nums[mid] > target:
            right = mid - k - 1
        else:
            left = mid + k + 1
    return -1
