from typing import List


def add_to_array_form(num: List[int], k: int) -> List[int]:
    i = len(num) - 1
    carry = 0
    out: List[int] = []
    while i >= 0 or k > 0 or carry:
        if i >= 0:
            carry += num[i]
            i -= 1
        carry += k % 10
        k //= 10
        out.append(carry % 10)
        carry //= 10
    return out[::-1]
