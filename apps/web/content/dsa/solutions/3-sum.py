from typing import List


def three_sum(nums: List[int]) -> List[List[int]]:
    nums.sort()
    n = len(nums)
    result: List[List[int]] = []
    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        target = -nums[i]
        left, right = i + 1, n - 1
        while left < right:
            current = nums[left] + nums[right]
            if current > target:
                right -= 1
            elif current < target:
                left += 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
    return result


class ThreeSumUsingTwoSumHelper:
    """
    Alternate structure from the archived solution: extract the inner two-pointer pass into a
    dedicated helper while the outer loop fixes the first element of each triplet.
    """

    def twoSum(self, nums: List[int], k: int, result: List[List[int]], target: int) -> None:
        i, j = k, len(nums) - 1
        while i < j:
            current_sum = nums[i] + nums[j]
            if current_sum > target:
                j -= 1  # Sum too large, decrease right pointer
            elif current_sum < target:
                i += 1  # Sum too small, increase left pointer
            else:
                result.append([-target, nums[i], nums[j]])
                while i < j and nums[i] == nums[i + 1]:
                    i += 1
                while i < j and nums[j] == nums[j - 1]:
                    j -= 1
                i += 1
                j -= 1

    def threeSum(self, nums: List[int]) -> List[List[int]]:
        if len(nums) < 3:
            return []
        result: List[List[int]] = []
        nums.sort()
        for i in range(len(nums) - 2):
            if i > 0 and nums[i] == nums[i - 1]:
                continue
            self.twoSum(nums, i + 1, result, -nums[i])
        return result
