"""
Geocode a Dutch postal code to lat/lon using the free nominatim API.
No API key required, but respects rate limits (max 1 req/sec).
"""

import httpx


async def postal_to_latlon(postal_code: str, country: str = "NL") -> tuple[float, float]:
    """Return (lat, lon) for a Dutch postal code."""
    clean = postal_code.replace(" ", "").upper()
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "postalcode": clean,
        "country": country,
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": "hendrik-cto-consultancy/1.0"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise ValueError(f"Could not geocode postal code: {postal_code}")

    return float(results[0]["lat"]), float(results[0]["lon"])
