from typing import List


def count_distinct(nums: List[int], k: int, p: int) -> int:
    seen: set[tuple[int, ...]] = set()
    n = len(nums)
    for i in range(n):
        cnt = 0
        for j in range(i, n):
            if nums[j] % p == 0:
                cnt += 1
            if cnt > k:
                break
            seen.add(tuple(nums[i : j + 1]))
    return len(seen)
