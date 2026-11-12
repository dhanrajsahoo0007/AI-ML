from typing import Tuple


def maximum_gain(s: str, x: int, y: int) -> int:
    def remove_pair(text: str, first: str, second: str, points: int) -> Tuple[str, int]:
        stack: list[str] = []
        score = 0
        for ch in text:
            if stack and stack[-1] == first and ch == second:
                stack.pop()
                score += points
            else:
                stack.append(ch)
        return "".join(stack), score

    if x >= y:
        mid, score_hi = remove_pair(s, "a", "b", x)
        _, score_lo = remove_pair(mid, "b", "a", y)
    else:
        mid, score_hi = remove_pair(s, "b", "a", y)
        _, score_lo = remove_pair(mid, "a", "b", x)
    return score_hi + score_lo
