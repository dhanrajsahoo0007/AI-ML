from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(self, val: int = 0, next: Optional[ListNode] = None):
        self.val = val
        self.next = next


def is_palindrome(head: Optional[ListNode]) -> bool:
    if not head or not head.next:
        return True

    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next

    def reverse(h: Optional[ListNode]) -> Optional[ListNode]:
        prev, cur = None, h
        while cur:
            nxt = cur.next
            cur.next = prev
            prev, cur = cur, nxt
        return prev

    second = reverse(slow.next)
    first = head
    while second:
        if first.val != second.val:
            return False
        first = first.next
        second = second.next
    return True


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


def is_palindrome_tests(a0):  # the entry the tests call
    result = is_palindrome(_build_list(a0))
    return result
