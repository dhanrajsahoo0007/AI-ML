from typing import List


def sum_odd_length_subarrays(arr: List[int]) -> int:
    n = len(arr)
    total = 0
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] + arr[i]
    for i in range(n):
        for j in range(i, n, 2):
            total += prefix[j + 1] - prefix[i]
    return total
