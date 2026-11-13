from typing import List


def merge_triplets(triplets: List[List[int]], target: List[int]) -> bool:
    a = b = c = False
    t0, t1, t2 = target
    for x, y, z in triplets:
        if x > t0 or y > t1 or z > t2:
            continue
        a = a or x == t0
        b = b or y == t1
        c = c or z == t2
    return a and b and c
