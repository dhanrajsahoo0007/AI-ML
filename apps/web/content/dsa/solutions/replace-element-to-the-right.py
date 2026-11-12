from typing import List


def replace_elements(arr: List[int]) -> List[int]:
    n = len(arr)
    max_right = -1
    # Walk right to left: each position becomes the max seen strictly to its right.
    for i in range(n - 1, -1, -1):
        current = arr[i]  # keep old value before overwriting
        arr[i] = max_right  # replace with best on the right (starts as -1 for last index)
        max_right = max(max_right, current)  # suffix max moves left with us
    return arr
