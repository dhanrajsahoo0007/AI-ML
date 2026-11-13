def minimum_deletions(s: str) -> int:
    stack: list[str] = []
    removals = 0
    for ch in s:
        if stack and stack[-1] == "b" and ch == "a":
            stack.pop()
            removals += 1
        else:
            stack.append(ch)
    return removals
