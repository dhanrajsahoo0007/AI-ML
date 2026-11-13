from typing import List


def min_cost(nums: List[int], cost: List[int]) -> int:
    pairs = sorted(zip(nums, cost), key=lambda x: x[0])
    total_w = sum(c for _, c in pairs)
    half = (total_w + 1) // 2
    run = 0
    target = pairs[0][0]
    for x, w in pairs:
        run += w
        if run >= half:
            target = x
            break
    return sum(c * abs(x - target) for x, c in zip(nums, cost))
