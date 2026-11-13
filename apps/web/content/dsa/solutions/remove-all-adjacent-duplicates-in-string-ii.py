from typing import List


def remove_duplicates(s: str, k: int) -> str:
    stack: List[list] = []
    for ch in s:
        if stack and stack[-1][0] == ch:
            stack[-1][1] += 1
            if stack[-1][1] == k:
                stack.pop()
        else:
            stack.append([ch, 1])
    return "".join(ch * cnt for ch, cnt in stack)
