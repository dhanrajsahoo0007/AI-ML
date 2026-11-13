def reverse_parentheses(s: str) -> str:
    n = len(s)
    pair = [0] * n
    stack: list[int] = []
    for i, ch in enumerate(s):
        if ch == "(":
            stack.append(i)
        elif ch == ")":
            j = stack.pop()
            pair[i] = j
            pair[j] = i
    result: list[str] = []
    direction = 1
    i = 0
    while i < n:
        if s[i] in "()":
            i = pair[i]
            direction = -direction
        else:
            result.append(s[i])
        i += direction
    return "".join(result)
