# --- Glue: converts the test arrays to nodes and back. Leave as is. ---
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def _to_list(values):
    if not values:
        return None
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def _from_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def reverse_list(values: list[int]) -> list[int]:  # the entry the tests call
    return _from_list(reverse_nodes(_to_list(values)))


# --- Your code ---
def reverse_nodes(head: ListNode | None) -> ListNode | None:
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
