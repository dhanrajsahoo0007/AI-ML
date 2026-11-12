from typing import List


def reverse_words(s: str) -> str:
    chars: List[str] = list(s)
    n = len(chars)

    def reverse_range(left: int, right: int) -> None:
        while left < right:
            chars[left], chars[right] = chars[right], chars[left]
            left += 1
            right -= 1

    start = 0
    for i in range(n + 1):
        if i == n or chars[i] == " ":
            reverse_range(start, i - 1)
            start = i + 1
    return "".join(chars)
