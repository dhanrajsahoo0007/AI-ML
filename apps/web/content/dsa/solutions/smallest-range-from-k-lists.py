import heapq
from typing import List


def smallest_range(nums: List[List[int]]) -> List[int]:
    min_heap = []
    current_max = float('-inf')

    for i in range(len(nums)):
        heapq.heappush(min_heap, (nums[i][0], i, 0))
        current_max = max(current_max, nums[i][0])

    result = [min_heap[0][0], current_max]

    while True:
        _, list_idx, elem_idx = heapq.heappop(min_heap)
        next_idx = elem_idx + 1

        if next_idx >= len(nums[list_idx]):
            break

        next_val = nums[list_idx][next_idx]
        heapq.heappush(min_heap, (next_val, list_idx, next_idx))
        current_max = max(current_max, next_val)

        current_min = min_heap[0][0]
        if current_max - current_min < result[1] - result[0]:
            result = [current_min, current_max]

    return result
