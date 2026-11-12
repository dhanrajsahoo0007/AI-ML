from typing import List


def sorted_squares(nums: List[int]) -> List[int]:
    n = len(nums)
    result = [0] * n
    left, right = 0, n - 1
    for pos in range(n - 1, -1, -1):
        left_sq = nums[left] * nums[left]
        right_sq = nums[right] * nums[right]
        if left_sq > right_sq:
            result[pos] = left_sq
            left += 1
        else:
            result[pos] = right_sq
            right -= 1
    return result
