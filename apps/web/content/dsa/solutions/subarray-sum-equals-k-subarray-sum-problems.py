from collections import defaultdict
from typing import List


def subarray_sum(nums: List[int], k: int) -> int:
    freq: defaultdict[int, int] = defaultdict(int)
    freq[0] = 1
    cur = 0
    ans = 0
    for x in nums:
        cur += x
        ans += freq[cur - k]
        freq[cur] += 1
    return ans
