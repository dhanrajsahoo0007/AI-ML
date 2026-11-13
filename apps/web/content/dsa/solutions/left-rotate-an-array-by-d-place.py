from typing import List


def rotate_left(nums: List[int], k: int) -> List[int]:
    n = len(nums)
    if n == 0:
        return nums
    k %= n
    nums[:] = nums[k:] + nums[:k]
    return nums
