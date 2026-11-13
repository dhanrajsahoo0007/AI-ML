from typing import List


def find_length_of_lcis(nums: List[int]) -> int:
    best = 1
    cur = 1

    for i in range(1, len(nums)):
        if nums[i] > nums[i - 1]:
            cur += 1
        else:
            cur = 1
        best = max(best, cur)

    return best
