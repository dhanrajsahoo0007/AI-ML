from typing import List, Tuple


def find_duplicate_and_missing(nums: List[int]) -> Tuple[List[int], List[int]]:
    n = len(nums)
    i = 0
    while i < n:
        j = nums[i] - 1
        if nums[i] != nums[j]:
            nums[i], nums[j] = nums[j], nums[i]
        else:
            i += 1
    dup: List[int] = []
    miss: List[int] = []
    for idx in range(n):
        if nums[idx] != idx + 1:
            dup.append(nums[idx])
            miss.append(idx + 1)
    dup = sorted(set(dup))
    miss.sort()
    return dup, miss
