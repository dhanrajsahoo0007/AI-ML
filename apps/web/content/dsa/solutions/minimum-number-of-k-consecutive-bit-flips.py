from typing import List


def min_k_bit_flips(nums: List[int], k: int) -> int:
    n = len(nums)
    hint = [0] * n
    flips = 0
    parity = 0
    for i, v in enumerate(nums):
        parity ^= hint[i]
        cur = v ^ parity
        if cur == 0:
            if i + k > n:
                return -1
            flips += 1
            parity ^= 1
            if i + k < n:
                hint[i + k] ^= 1
    return flips
