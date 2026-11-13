from bisect import bisect_left, bisect_right
from collections import defaultdict
from typing import Dict, List, Literal


class Solution:
    def __init__(self) -> None:
        self._user_times: Dict[str, List[int]] = defaultdict(list)

    def add_user_activity(self, user_id: str, timestamp: int) -> None:
        times = self._user_times[user_id]
        idx = bisect_left(times, timestamp)
        times.insert(idx, timestamp)

    def calculate_activity(
        self,
        user_id: str,
        start_timestamp: int,
        end_timestamp: int,
        frequency: Literal["minutes", "hours"],
    ) -> List[Dict[str, int]]:
        if start_timestamp > end_timestamp:
            return []

        width = 60 if frequency == "minutes" else 3600
        times = self._user_times[user_id]
        out: List[Dict[str, int]] = []

        i = 0
        while True:
            display_low = start_timestamp + i * width
            if display_low > end_timestamp:
                break
            if i > 0 and display_low == end_timestamp:
                break
            display_high = min(start_timestamp + (i + 1) * width, end_timestamp)
            low_count = display_low if i == 0 else display_low + 1
            high_count = display_high
            left = bisect_left(times, low_count)
            right = bisect_right(times, high_count)
            out.append({"start": display_low, "end": display_high, "count": right - left})
            i += 1

        return out
