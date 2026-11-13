from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def swap_pairs(head: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    prev, cur = dummy, head
    while cur and cur.next:
        nxt_pair = cur.next.next
        second = cur.next
        second.next = cur
        cur.next = nxt_pair
        prev.next = second
        prev = cur
        cur = nxt_pair
    return dummy.next


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


def swap_pairs_tests(a0):  # the entry the tests call
    result = _list_values(swap_pairs(_build_list(a0)))
    return result
