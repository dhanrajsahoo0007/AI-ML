from typing import List


def letter_combinations(digits: str) -> List[str]:
    if not digits:
        return []
    letters = {
        "2": "abc",
        "3": "def",
        "4": "ghi",
        "5": "jkl",
        "6": "mno",
        "7": "pqrs",
        "8": "tuv",
        "9": "wxyz",
    }
    result: List[str] = []

    def backtrack(index: int, path: List[str]) -> None:
        if index == len(digits):
            result.append("".join(path))
            return
        for ch in letters[digits[index]]:
            path.append(ch)
            backtrack(index + 1, path)
            path.pop()

    backtrack(0, [])
    return result


# --- Glue (same as the starter) ---

def letter_combinations_tests(a0):  # the entry the tests call
    result = letter_combinations(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
