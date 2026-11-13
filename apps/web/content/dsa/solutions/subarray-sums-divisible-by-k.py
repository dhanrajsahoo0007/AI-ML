from collections import defaultdict
from typing import List


def subarrays_div_by_k(nums: List[int], k: int) -> int:
    freq: defaultdict[int, int] = defaultdict(int)
    freq[0] = 1
    cur = 0
    ans = 0
    for x in nums:
        cur = (cur + x) % k
        ans += freq[cur]
        freq[cur] += 1
    return ans
