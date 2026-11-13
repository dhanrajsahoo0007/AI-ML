from typing import List


def single_number(nums: List[int]) -> int:
    ans = 0
    for x in nums:
        ans ^= x
    return ans
