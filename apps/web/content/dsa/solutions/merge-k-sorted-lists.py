import heapq


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


def merge_k_lists(lists: list[list[int]]) -> list[int]:  # the entry the tests call
    return _from_list(merge_nodes([_to_list(values) for values in lists]))


# --- Your code ---
def merge_nodes(lists: list[ListNode | None]) -> ListNode | None:
    heap = []
    for i, h in enumerate(lists):
        if h:
            heapq.heappush(heap, (h.val, i, h))

    dummy = ListNode(0)
    tail = dummy
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node
        tail = tail.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    tail.next = None
    return dummy.next
