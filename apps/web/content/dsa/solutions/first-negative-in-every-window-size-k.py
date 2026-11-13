from collections import deque
from typing import List


def first_neg_in_every_window(arr: List[int], k: int) -> List[int]:
    dq: deque[int] = deque()
    out: List[int] = []

    for j in range(len(arr)):
        if arr[j] < 0:
            dq.append(j)

        if dq and dq[0] <= j - k:
            dq.popleft()

        if j >= k - 1:
            out.append(arr[dq[0]] if dq else 0)

    return out
