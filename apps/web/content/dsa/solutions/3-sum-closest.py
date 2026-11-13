from typing import List


def three_sum_closest(nums: List[int], target: int) -> int:
    nums.sort()
    n = len(nums)
    closest = nums[0] + nums[1] + nums[2]
    for i in range(n - 2):
        left, right = i + 1, n - 1
        while left < right:
            current = nums[i] + nums[left] + nums[right]
            if abs(target - current) < abs(target - closest):
                closest = current
            if current == target:
                return current
            if current > target:
                right -= 1
            else:
                left += 1
    return closest
