from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def swap_nodes(head: Optional[ListNode], k: int) -> Optional[ListNode]:
    if not head:
        return None
    cur = head
    for _ in range(k - 1):
        cur = cur.next
    left = cur
    right = head
    while cur.next:
        cur = cur.next
        right = right.next
    left.val, right.val = right.val, left.val
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


def swap_nodes_tests(a0, a1):  # the entry the tests call
    result = _list_values(swap_nodes(_build_list(a0), a1))
    return result
