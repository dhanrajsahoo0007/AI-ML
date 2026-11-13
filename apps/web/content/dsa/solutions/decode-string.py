def decode_string(s: str) -> str:
    stack: list[str] = []
    for ch in s:
        if ch != "]":
            stack.append(ch)
            continue
        fragment: list[str] = []
        while stack[-1] != "[":
            fragment.append(stack.pop())
        stack.pop()
        repeat = ""
        while stack and stack[-1].isdigit():
            repeat = stack.pop() + repeat
        stack.append(int(repeat) * "".join(reversed(fragment)))
    return "".join(stack)
