from typing import List, Tuple


class ConferenceRoom:
    def __init__(self) -> None:
        self._bookings: List[Tuple[int, int]] = []

    @staticmethod
    def _overlaps(a: int, b: int, c: int, d: int) -> bool:
        """True iff closed intervals [a,b] and [c,d] overlap with positive length."""
        return max(a, c) < min(b, d)

    def book(self, start: int, end: int) -> bool:
        for s, e in self._bookings:
            if self._overlaps(start, end, s, e):
                return False
        self._bookings.append((start, end))
        return True
