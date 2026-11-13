from typing import List


def reverse_stack(stack: List[int]) -> List[int]:
    if len(stack) <= 1:
        return stack
    top = stack.pop()
    reverse_stack(stack)
    _insert_at_bottom(stack, top)
    return stack


def _insert_at_bottom(stack: List[int], value: int) -> None:
    if not stack:
        stack.append(value)
        return
    temp = stack.pop()
    _insert_at_bottom(stack, value)
    stack.append(temp)
