def remove_kdigits(num: str, k: int) -> str:
    stack: list[str] = []
    for ch in num:
        while stack and stack[-1] > ch and k > 0:
            stack.pop()
            k -= 1
        if stack or ch != "0":
            stack.append(ch)
    if k:
        stack = stack[:-k]
    return "".join(stack) or "0"
