from typing import List


def max_turbulence_size(arr: List[int]) -> int:
    if len(arr) < 2:
        return len(arr)
    inc = dec = 1
    best = 1
    for i in range(1, len(arr)):
        if arr[i] > arr[i - 1]:
            inc = dec + 1
            dec = 1
        elif arr[i] < arr[i - 1]:
            dec = inc + 1
            inc = 1
        else:
            inc = dec = 1
        best = max(best, inc, dec)
    return best
