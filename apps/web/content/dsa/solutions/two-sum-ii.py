from typing import List


def two_sum(numbers: List[int], target: int) -> List[int]:
    i, j = 0, len(numbers) - 1
    while i < j:
        current = numbers[i] + numbers[j]
        if current == target:
            return [i + 1, j + 1]
        if current < target:
            i += 1
        else:
            j -= 1
    return []
