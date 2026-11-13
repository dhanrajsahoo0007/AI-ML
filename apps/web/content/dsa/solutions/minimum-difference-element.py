from typing import List


def find_closest_element(nums: List[int], target: int) -> int:
    if not nums:
        raise ValueError("nums must be non-empty")
    if target <= nums[0]:
        return nums[0]
    if target >= nums[-1]:
        return nums[-1]

    def floor_index() -> int:
        left, right = 0, len(nums) - 1
        fl = -1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                fl = mid
                left = mid + 1
            else:
                right = mid - 1
        return fl

    def ceiling_index() -> int:
        left, right = 0, len(nums) - 1
        ce = len(nums)
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                left = mid + 1
            else:
                ce = mid
                right = mid - 1
        return ce

    fi = floor_index()
    ci = ceiling_index()
    if fi == ci:
        return nums[fi]
    if target - nums[fi] <= nums[ci] - target:
        return nums[fi]
    return nums[ci]
