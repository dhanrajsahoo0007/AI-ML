from typing import List


def remove_duplicate_letters(s: str) -> str:
    last = {ch: i for i, ch in enumerate(s)}
    stack: List[str] = []
    seen = [False] * 26
    for i, ch in enumerate(s):
        idx = ord(ch) - ord("a")
        if seen[idx]:
            continue
        while stack and ch < stack[-1] and last[stack[-1]] > i:
            top = stack.pop()
            seen[ord(top) - ord("a")] = False
        stack.append(ch)
        seen[idx] = True
    return "".join(stack)
