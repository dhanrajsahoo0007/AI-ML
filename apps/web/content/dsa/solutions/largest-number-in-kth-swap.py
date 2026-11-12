from typing import List


def find_maximum_num(num_str: str, k: int) -> str:
    digits: List[str] = list(num_str)
    best = [num_str]

    def swap(i: int, j: int) -> None:
        digits[i], digits[j] = digits[j], digits[i]

    def dfs(index: int, swaps: int) -> None:
        cur = "".join(digits)
        if cur > best[0]:
            best[0] = cur
        if swaps == 0 or index == len(digits):
            return
        max_digit = max(digits[index:])
        if digits[index] != max_digit:
            for j in range(index + 1, len(digits)):
                if digits[j] == max_digit:
                    swap(index, j)
                    dfs(index + 1, swaps - 1)
                    swap(index, j)
        dfs(index + 1, swaps)

    dfs(0, k)
    return best[0]
