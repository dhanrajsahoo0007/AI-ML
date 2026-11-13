from collections import deque
from typing import List


def max_sliding_window(nums: List[int], k: int) -> List[int]:
    dq: deque[int] = deque()
    out: List[int] = []

    for i in range(len(nums)):
        while dq and nums[dq[-1]] <= nums[i]:
            dq.pop()
        dq.append(i)

        if dq[0] <= i - k:
            dq.popleft()

        if i >= k - 1:
            out.append(nums[dq[0]])

    return out
