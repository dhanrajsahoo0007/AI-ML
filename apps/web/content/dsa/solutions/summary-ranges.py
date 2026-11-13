from typing import List


def summary_ranges(nums: List[int]) -> List[str]:
    if not nums:
        return []

    out: List[str] = []
    i = 0
    n = len(nums)

    while i < n:
        start = nums[i]
        while i + 1 < n and nums[i + 1] == nums[i] + 1:
            i += 1
        end = nums[i]
        if start == end:
            out.append(str(start))
        else:
            out.append(f"{start}->{end}")
        i += 1

    return out
