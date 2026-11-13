from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def remove_nodes(head: Optional[ListNode]) -> Optional[ListNode]:
    def reverse(h: Optional[ListNode]) -> Optional[ListNode]:
        prev, cur = None, h
        while cur:
            nxt = cur.next
            cur.next = prev
            prev, cur = cur, nxt
        return prev

    head = reverse(head)
    if not head:
        return None
    cur = head
    cur_max = cur.val
    while cur.next:
        if cur.next.val < cur_max:
            cur.next = cur.next.next
        else:
            cur_max = cur.next.val
            cur = cur.next
    return reverse(head)


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


def remove_nodes_tests(a0):  # the entry the tests call
    result = _list_values(remove_nodes(_build_list(a0)))
    return result
