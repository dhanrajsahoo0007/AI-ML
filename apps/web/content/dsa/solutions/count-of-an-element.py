from typing import List


def count(nums: List[int], target: int) -> int:
    def first() -> int:
        left, right = 0, len(nums) - 1
        res = -1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                res = mid
                right = mid - 1
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return res

    def last() -> int:
        left, right = 0, len(nums) - 1
        res = -1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                res = mid
                left = mid + 1
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return res

    lo = first()
    if lo == -1:
        return 0
    return last() - lo + 1
