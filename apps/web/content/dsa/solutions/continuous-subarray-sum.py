from typing import List


def check_subarray_sum(nums: List[int], k: int) -> bool:
    pref = 0
    seen: dict[int, int] = {0: -1}
    for i, v in enumerate(nums):
        pref = (pref + v) % k
        if pref in seen:
            if i - seen[pref] > 1:
                return True
        else:
            seen[pref] = i
    return False
