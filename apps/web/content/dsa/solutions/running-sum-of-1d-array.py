from typing import List


def running_sum(nums: List[int]) -> List[int]:
    total = 0
    out: List[int] = []
    for x in nums:
        total += x
        out.append(total)
    return out
