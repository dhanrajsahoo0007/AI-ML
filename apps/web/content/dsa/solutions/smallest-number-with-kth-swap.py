from typing import List


def find_smallest_num(num_str: str, k: int) -> str:
    digits: List[str] = list(num_str)
    best = [num_str]

    def swap(i: int, j: int) -> None:
        digits[i], digits[j] = digits[j], digits[i]

    def dfs(index: int, swaps: int) -> None:
        cur = "".join(digits)
        if cur < best[0]:
            best[0] = cur
        if swaps == 0 or index == len(digits):
            return
        min_digit = min(digits[index:])
        if digits[index] != min_digit:
            for j in range(len(digits) - 1, index, -1):
                if digits[j] == min_digit:
                    swap(index, j)
                    dfs(index + 1, swaps - 1)
                    swap(index, j)
        dfs(index + 1, swaps)

    dfs(0, k)
    return best[0]
