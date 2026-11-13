from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def partition(head: Optional[ListNode], x: int) -> Optional[ListNode]:
    before_dummy = ListNode(0)
    after_dummy = ListNode(0)
    before = before_dummy
    after = after_dummy
    while head:
        if head.val < x:
            before.next = head
            before = before.next
        else:
            after.next = head
            after = after.next
        head = head.next
    after.next = None
    before.next = after_dummy.next
    return before_dummy.next


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


def partition_tests(a0, a1):  # the entry the tests call
    result = _list_values(partition(_build_list(a0), a1))
    return result
