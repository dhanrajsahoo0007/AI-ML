import math
from typing import List


def get_permutation(n: int, k: int) -> str:
    nums: List[str] = [str(i) for i in range(1, n + 1)]
    k -= 1
    result: List[str] = []
    while nums:
        fact = math.factorial(len(nums) - 1)
        idx, k = divmod(k, fact)
        result.append(nums.pop(idx))
    return "".join(result)
