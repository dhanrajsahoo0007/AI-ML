from __future__ import annotations

from typing import List, Optional


class ListNode:
    def __init__(
        self,
        val: int = 0,
        prev: Optional[ListNode] = None,
        next: Optional[ListNode] = None,
    ):
        self.val = val
        self.prev = prev
        self.next = next


class Solution:
    def __init__(self) -> None:
        self.head: Optional[ListNode] = None
        self.tail: Optional[ListNode] = None

    def insert_at_beginning(self, val: int) -> None:
        node = ListNode(val)
        if self.head is None:
            self.head = self.tail = node
            return
        node.next = self.head
        self.head.prev = node
        self.head = node

    def insert_at_end(self, val: int) -> None:
        node = ListNode(val)
        if self.tail is None:
            self.head = self.tail = node
            return
        node.prev = self.tail
        self.tail.next = node
        self.tail = node

    def delete_value(self, val: int) -> None:
        cur = self.head
        while cur:
            if cur.val == val:
                if cur.prev:
                    cur.prev.next = cur.next
                else:
                    self.head = cur.next
                if cur.next:
                    cur.next.prev = cur.prev
                else:
                    self.tail = cur.prev
                return
            cur = cur.next

    def length(self) -> int:
        n = 0
        cur = self.head
        while cur:
            n += 1
            cur = cur.next
        return n

    def values_forward(self) -> List[int]:
        out: List[int] = []
        cur = self.head
        while cur:
            out.append(cur.val)
            cur = cur.next
        return out

    def values_backward(self) -> List[int]:
        out: List[int] = []
        cur = self.tail
        while cur:
            out.append(cur.val)
            cur = cur.prev
        return out

    def reverse(self) -> None:
        cur = self.head
        self.head, self.tail = self.tail, self.head
        while cur:
            cur.prev, cur.next = cur.next, cur.prev
            cur = cur.prev
