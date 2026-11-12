from typing import List


def check_arithmetic_subarrays(nums: List[int], l: List[int], r: List[int]) -> List[bool]:
    answer: List[bool] = []
    for left, right in zip(l, r):
        chunk = sorted(nums[left : right + 1])
        if len(chunk) < 2:
            answer.append(True)
            continue
        step = chunk[1] - chunk[0]
        ok = all(chunk[i] - chunk[i - 1] == step for i in range(2, len(chunk)))
        answer.append(ok)
    return answer
