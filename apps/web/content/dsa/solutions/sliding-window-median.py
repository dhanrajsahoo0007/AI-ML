import heapq
from collections import defaultdict
from typing import List


def median_sliding_window(nums: List[int], k: int) -> List[float]:
    left = []
    right = []
    lazy_delete = defaultdict(int)
    medians = []

    for i in range(k):
        heapq.heappush(left, -nums[i])
    for _ in range(k // 2):
        heapq.heappush(right, -heapq.heappop(left))

    idx = k
    while True:
        if k % 2 == 1:
            medians.append(float(-left[0]))
        else:
            medians.append((-left[0] + right[0]) * 0.5)

        if idx >= len(nums):
            break

        out_num = nums[idx - k]
        in_num = nums[idx]
        idx += 1
        balance = 0

        # Outgoing element: if it lived on the small side, the small heap loses mass.
        balance += -1 if out_num <= -left[0] else 1
        lazy_delete[out_num] += 1

        if left and in_num <= -left[0]:
            balance += 1
            heapq.heappush(left, -in_num)
        else:
            balance -= 1
            heapq.heappush(right, in_num)

        if balance < 0:
            heapq.heappush(left, -heapq.heappop(right))
        elif balance > 0:
            heapq.heappush(right, -heapq.heappop(left))

        while left and lazy_delete[-left[0]]:
            lazy_delete[-left[0]] -= 1
            heapq.heappop(left)

        while right and lazy_delete[right[0]]:
            lazy_delete[right[0]] -= 1
            heapq.heappop(right)

    return medians


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def median_sliding_window_tests(a0, a1):  # the entry the tests call
    result = median_sliding_window(a0, a1)
    result = _rounded(result)
    return result
