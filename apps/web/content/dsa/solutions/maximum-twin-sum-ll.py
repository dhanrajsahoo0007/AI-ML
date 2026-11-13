from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def pair_sum(head: Optional[ListNode]) -> int:
    if not head:
        return 0
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    prev: Optional[ListNode] = None
    cur = slow
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt

    max_sum = 0
    first, second = head, prev
    while second:
        max_sum = max(max_sum, first.val + second.val)
        first = first.next
        second = second.next
    return max_sum


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


def pair_sum_tests(a0):  # the entry the tests call
    result = pair_sum(_build_list(a0))
    return result
