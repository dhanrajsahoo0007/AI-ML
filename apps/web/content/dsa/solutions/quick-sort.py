from typing import List


def quick_sort(nums: List[int]) -> List[int]:
    if len(nums) <= 1:
        return list(nums)
    pivot = nums[-1]
    less = [x for x in nums[:-1] if x < pivot]
    equal = [x for x in nums if x == pivot]
    greater = [x for x in nums[:-1] if x > pivot]
    return quick_sort(less) + equal + quick_sort(greater)
