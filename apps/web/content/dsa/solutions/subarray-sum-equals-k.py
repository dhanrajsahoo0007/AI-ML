from typing import List


def subarray_sum(nums: List[int], k: int) -> int:
    count = 0
    cum = 0
    sum_freq = {0: 1}

    for num in nums:
        cum += num
        count += sum_freq.get(cum - k, 0)
        sum_freq[cum] = sum_freq.get(cum, 0) + 1

    return count
