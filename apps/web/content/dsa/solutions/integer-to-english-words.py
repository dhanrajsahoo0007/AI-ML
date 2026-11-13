from typing import List


def number_to_words(num: int) -> str:
    if num == 0:
        return "Zero"
    below_20 = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ]
    tens = [
        "",
        "Ten",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ]
    scales = ["", "Thousand", "Million", "Billion"]

    def under_thousand(n: int) -> List[str]:
        parts: List[str] = []
        if n >= 100:
            parts.append(below_20[n // 100])
            parts.append("Hundred")
            n %= 100
        if n >= 20:
            parts.append(tens[n // 10])
            n %= 10
        if n > 0:
            parts.append(below_20[n])
        return parts

    words: List[str] = []
    scale = 0
    while num > 0:
        chunk = num % 1000
        if chunk:
            chunk_words = under_thousand(chunk)
            if scales[scale]:
                chunk_words.append(scales[scale])
            words = chunk_words + words
        num //= 1000
        scale += 1
    return " ".join(words)
