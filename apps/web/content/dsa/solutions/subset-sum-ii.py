from typing import List


def subsets_with_dup(nums: List[int]) -> List[List[int]]:
    nums.sort()
    result: List[List[int]] = []

    def backtrack(start: int, path: List[int]) -> None:
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()

    backtrack(0, [])
    return result


# --- Glue (same as the starter) ---

def subsets_with_dup_tests(a0):  # the entry the tests call
    result = subsets_with_dup(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
