from typing import List


def find_platform(arr: List[int], dep: List[int]) -> int:
    arr.sort()
    dep.sort()
    i = j = 0
    need = 0
    best = 0
    n = len(arr)
    while i < n:
        if arr[i] <= dep[j]:
            need += 1
            best = max(best, need)
            i += 1
        else:
            need -= 1
            j += 1
    return best
