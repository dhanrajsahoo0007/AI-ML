def min_remove_to_make_valid(s: str) -> str:
    remove: set[int] = set()
    stack: list[int] = []
    for i, ch in enumerate(s):
        if ch == "(":
            stack.append(i)
        elif ch == ")":
            if stack:
                stack.pop()
            else:
                remove.add(i)
    remove.update(stack)
    return "".join(ch for i, ch in enumerate(s) if i not in remove)
