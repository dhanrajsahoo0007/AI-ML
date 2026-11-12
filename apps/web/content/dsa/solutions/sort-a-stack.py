from typing import List


def sort_stack(stack: List[int]) -> List[int]:
    if len(stack) <= 1:
        return stack
    top = stack.pop()
    sort_stack(stack)
    _insert_sorted(stack, top)
    return stack


def _insert_sorted(stack: List[int], element: int) -> None:
    if not stack or element >= stack[-1]:
        stack.append(element)
        return
    top = stack.pop()
    _insert_sorted(stack, element)
    stack.append(top)
