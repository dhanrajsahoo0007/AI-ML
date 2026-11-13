from typing import List


def array_rank_transform(arr: List[int]) -> List[int]:
    if not arr:
        return []
    sorted_unique = sorted(set(arr))  # ordered distinct values define rank order
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}  # value -> 1-based rank
    return [rank[x] for x in arr]  # project original positions to ranks
