from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def delete_middle(head: Optional[ListNode]) -> Optional[ListNode]:
    if not head or not head.next:
        return None
    slow = fast = head
    prev: Optional[ListNode] = None
    while fast and fast.next:
        fast = fast.next.next
        prev = slow
        slow = slow.next
    if prev:
        prev.next = slow.next if slow else None
    return head


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


def delete_middle_tests(a0):  # the entry the tests call
    result = _list_values(delete_middle(_build_list(a0)))
    return result
