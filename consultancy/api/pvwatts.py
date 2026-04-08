"""
PVWatts v8 API client — estimates solar potential for a given location + roof config.
Docs: https://developer.nrel.gov/docs/solar/pvwatts/v8/
"""

import httpx
import os
from typing import Optional


PVWATTS_BASE = "https://developer.nrel.gov/api/pvwatts/v8.json"


async def estimate_solar(
    *,
    lat: float,
    lon: float,
    system_capacity_kw: float,
    roof_tilt_deg: float = 30.0,
    azimuth_deg: float = 180.0,  # south-facing default
    losses_pct: float = 14.0,
    array_type: int = 1,   # 1 = fixed roof-mounted
    module_type: int = 0,  # 0 = standard
    timeframe: str = "monthly",
) -> dict:
    """Call PVWATTS API and return raw + derived results."""

    api_key = os.getenv("PVWATTS_API_KEY", "DEMO_KEY")

    params = {
        "api_key": api_key,
        "lat": lat,
        "lon": lon,
        "system_capacity": system_capacity_kw,
        "tilt": roof_tilt_deg,
        "azimuth": azimuth_deg,
        "losses": losses_pct,
        "array_type": array_type,
        "module_type": module_type,
        "timeframe": timeframe,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(PVWATTS_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    if "errors" in data and data["errors"]:
        raise ValueError(f"PVWatts error: {data['errors']}")

    outputs = data.get("outputs", {})
    station_info = data.get("station_info", {})

    annual_kwh = outputs.get("ac_annual", 0)
    monthly_kwh = outputs.get("ac_monthly", [])

    return {
        "annual_kwh": round(annual_kwh, 1),
        "monthly_kwh": [round(v, 1) for v in monthly_kwh],
        "capacity_factor_pct": round(outputs.get("capacity_factor", 0), 2),
        "station_info": station_info,
        "raw_outputs": outputs,
    }


def estimate_system_capacity(roof_area_m2: float, efficiency: float = 0.20) -> float:
    """
    Rough system capacity from roof area.
    Standard: ~200W per m² for modern panels at 20% efficiency.
    We use available roof area × panel efficiency × 1000 W/kW.
    Returns kWp.
    """
    # Assume ~75% of roof area is usable (chimneys, edges, shading)
    usable_area = roof_area_m2 * 0.75
    return round(usable_area * efficiency, 2)


def estimate_savings(
    annual_kwh: float,
    *,
    self_consumption_pct: float = 0.40,
    grid_price_eur: float = 0.30,
    feed_in_tariff_eur: float = 0.08,
) -> dict:
    """
    Estimate annual savings from a solar install.
    Split into self-consumed (saves retail price) vs exported (feed-in tariff).
    """
    self_consumed = annual_kwh * self_consumption_pct
    exported = annual_kwh * (1 - self_consumption_pct)

    savings_self = self_consumed * grid_price_eur
    savings_export = exported * feed_in_tariff_eur
    total_savings = savings_self + savings_export

    # Rough payback estimate: ~€1200/kWp install cost in NL (2024)
    # system_kw not passed here — just per-kWh payback indicator
    return {
        "self_consumed_kwh": round(self_consumed, 1),
        "exported_kwh": round(exported, 1),
        "savings_self_eur": round(savings_self, 2),
        "savings_export_eur": round(savings_export, 2),
        "total_annual_savings_eur": round(total_savings, 2),
    }
