from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def merge_in_between(
    list1: Optional[ListNode],
    a: int,
    b: int,
    list2: Optional[ListNode],
) -> Optional[ListNode]:
    if not list1:
        return list2
    prev = list1
    for _ in range(a - 1):
        prev = prev.next
    curr = prev
    for _ in range(b - a + 2):
        curr = curr.next
    prev.next = list2
    tail = list2
    while tail and tail.next:
        tail = tail.next
    if tail:
        tail.next = curr
    return list1


# --- Glue (same as the starter) ---

def _build_list(values):
    head = None
    for v in reversed(values or []):
        node = ListNode(v)
        node.next = head
        head = node
    return head


def _list_values(node):
    out = []
    while node is not None:
        out.append(node.val)
        node = node.next
    return out


def merge_in_between_tests(a0, a1, a2, a3):  # the entry the tests call
    result = _list_values(merge_in_between(_build_list(a0), a1, a2, _build_list(a3)))
    return result
