from typing import List


def max_sub_array(nums: List[int]) -> int:
    # `res` tracks the global maximum contiguous sum seen so far.
    res = nums[0]
    # `total` is the sum of the "active" subarray ending at the current index.
    total = 0
    for n in nums:
        total += n
        res = max(res, total)
        # Drop toxic prefixes: a negative running sum hurts every extension.
        if total < 0:
            total = 0
    return res
