from typing import List


def remove_duplicates(s: str) -> str:
    stack: List[str] = []
    for ch in s:
        if stack and stack[-1] == ch:
            stack.pop()
        else:
            stack.append(ch)
    return "".join(stack)
