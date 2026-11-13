from typing import List


def permute_unique(nums: List[int]) -> List[List[int]]:
    nums.sort()
    result: List[List[int]] = []

    def swap(i: int, j: int) -> None:
        nums[i], nums[j] = nums[j], nums[i]

    def backtrack(start: int) -> None:
        if start == len(nums):
            result.append(nums[:])
            return
        # `seen` is local to this depth: skip duplicate values already tried at index `start`.
        seen: set[int] = set()
        for i in range(start, len(nums)):
            if nums[i] in seen:
                continue
            seen.add(nums[i])
            swap(start, i)
            backtrack(start + 1)
            swap(start, i)  # restore array before trying the next swap partner

    backtrack(0)
    return result


# --- Glue (same as the starter) ---

def permute_unique_tests(a0):  # the entry the tests call
    result = permute_unique(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
