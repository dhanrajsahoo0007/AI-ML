class MinHeap:
    def __init__(self, array=None):
        self.heap = array[:] if array else []
        if self.heap:
            self.heapify()

    def heapify(self):
        # Bottom-up: sift down from last parent to root — O(n) build.
        first_parent_idx = (len(self.heap) - 2) // 2
        for current_idx in range(first_parent_idx, -1, -1):
            self.sift_down(current_idx, len(self.heap) - 1)

    def sift_down(self, current_idx, end_idx):
        # Compare node with smaller child and swap until heap property holds.
        left_child_idx = current_idx * 2 + 1
        while left_child_idx <= end_idx:
            right_child_idx = current_idx * 2 + 2 if current_idx * 2 + 2 <= end_idx else -1
            if right_child_idx != -1 and self.heap[right_child_idx] < self.heap[left_child_idx]:
                idx_to_swap = right_child_idx
            else:
                idx_to_swap = left_child_idx
            if self.heap[idx_to_swap] < self.heap[current_idx]:
                self.swap(current_idx, idx_to_swap)
                current_idx = idx_to_swap
                left_child_idx = current_idx * 2 + 1
            else:
                break

    def sift_up(self, current_idx):
        parent_idx = (current_idx - 1) // 2
        while current_idx > 0 and self.heap[current_idx] < self.heap[parent_idx]:
            self.swap(current_idx, parent_idx)
            current_idx = parent_idx
            parent_idx = (current_idx - 1) // 2

    def peek(self):
        if self.heap:
            return self.heap[0]
        return None

    def insert(self, value):
        self.heap.append(value)
        self.sift_up(len(self.heap) - 1)

    def remove(self):
        if not self.heap:
            return None
        # Classic trick: move min to end, shrink heap, sift new root down.
        self.swap(0, len(self.heap) - 1)
        value_to_remove = self.heap.pop()
        if self.heap:
            self.sift_down(0, len(self.heap) - 1)
        return value_to_remove

    def swap(self, i, j):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]

    def __len__(self):
        return len(self.heap)

    def __repr__(self):
        return f"MinHeap({self.heap})"
