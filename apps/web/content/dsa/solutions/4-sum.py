from typing import List


def four_sum(nums: List[int], target: int) -> List[List[int]]:
    nums.sort()
    n = len(nums)
    result: List[List[int]] = []
    if n < 4:
        return result
    for i in range(n - 3):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        for j in range(i + 1, n - 2):
            if j > i + 1 and nums[j] == nums[j - 1]:
                continue
            left, right = j + 1, n - 1
            need = target - nums[i] - nums[j]
            while left < right:
                pair_sum = nums[left] + nums[right]
                if pair_sum < need:
                    left += 1
                elif pair_sum > need:
                    right -= 1
                else:
                    result.append([nums[i], nums[j], nums[left], nums[right]])
                    left += 1
                    right -= 1
                    while left < right and nums[left] == nums[left - 1]:
                        left += 1
                    while left < right and nums[right] == nums[right + 1]:
                        right -= 1
    return result
