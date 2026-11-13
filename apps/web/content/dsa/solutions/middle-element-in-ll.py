from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def middle_node(head: Optional[ListNode]) -> Optional[ListNode]:
    if not head:
        return None
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


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


def middle_node_tests(a0):  # the entry the tests call
    result = _list_values(middle_node(_build_list(a0)))
    return result
