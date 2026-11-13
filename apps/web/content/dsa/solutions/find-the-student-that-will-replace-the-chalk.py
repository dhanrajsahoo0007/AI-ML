from typing import List


def chalk_replacer(chalk: List[int], k: int) -> int:
    total = sum(chalk)
    k %= total
    if k == 0:
        k = total
    for i, use in enumerate(chalk):
        if k < use:
            return i
        k -= use
    return 0
