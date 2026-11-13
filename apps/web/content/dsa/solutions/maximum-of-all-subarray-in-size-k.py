from collections import deque
from typing import List


def max_of_subarrays(arr: List[int], k: int) -> List[int]:
    n = len(arr)
    if n == 0 or k <= 0 or k > n:
        return []

    dq: deque[int] = deque()
    res: List[int] = []

    for j in range(n):
        while dq and arr[dq[-1]] <= arr[j]:
            dq.pop()
        dq.append(j)

        if dq[0] <= j - k:
            dq.popleft()

        if j >= k - 1:
            res.append(arr[dq[0]])

    return res
