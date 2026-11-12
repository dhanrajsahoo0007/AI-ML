from typing import List


def can_jump(nums: List[int]) -> bool:
    goal = len(nums) - 1
    for i in range(len(nums) - 1, -1, -1):
        # nums[i] is the maximum forward jump length from position i.
        if i + nums[i] >= goal:
            goal = i
    return goal == 0
