import heapq
from typing import List


def k_smallest_pairs(nums1: List[int], nums2: List[int], k: int) -> List[List[int]]:
    if not nums1 or not nums2:
        return []

    results = []
    heap = [(nums1[0] + nums2[0], 0, 0)]
    seen = {(0, 0)}

    while len(results) < k and heap:
        _, i, j = heapq.heappop(heap)
        results.append([nums1[i], nums2[j]])

        # Explore neighbors in the "sum matrix" without revisiting coordinates.
        if i + 1 < len(nums1) and (i + 1, j) not in seen:
            heapq.heappush(heap, (nums1[i + 1] + nums2[j], i + 1, j))
            seen.add((i + 1, j))

        if j + 1 < len(nums2) and (i, j + 1) not in seen:
            heapq.heappush(heap, (nums1[i] + nums2[j + 1], i, j + 1))
            seen.add((i, j + 1))

    return results
