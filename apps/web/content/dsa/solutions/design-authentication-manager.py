from typing import Dict


class Solution:
    def __init__(self, timeToLive: int) -> None:
        self._ttl = timeToLive
        self._expiry: Dict[str, int] = {}

    def generate(self, tokenId: str, currentTime: int) -> None:
        self._expiry[tokenId] = currentTime + self._ttl

    def renew(self, tokenId: str, currentTime: int) -> None:
        if tokenId in self._expiry and self._expiry[tokenId] > currentTime:
            self._expiry[tokenId] = currentTime + self._ttl

    def countUnexpiredTokens(self, currentTime: int) -> int:
        return sum(1 for t in self._expiry.values() if t > currentTime)
