"use client";

import { useState, useEffect } from "react";

interface ItemPrices {
  cookedFish: number;
  heavyAmmo: number;
  steel: number;
  bread: number;
  grain: number;
  limestone: number;
  coca: number;
  concrete: number;
  oil: number;
  case1: number;
  lightAmmo: number;
  steak: number;
  livestock: number;
  cocain: number;
  lead: number;
  fish: number;
  petroleum: number;
  ammo: number;
  iron: number;
  scraps: number;
  case2: number;
}

// Equipment tier mapping: API uses different numbering
// Chest: chest1=gray, chest2=green, chest3=blue, chest4=purple, chest5=yellow, chest6=red
// Pants: pants1=green, pants2=blue, pants3=purple, pants4=yellow, pants5=red (no gray?)
// Boots: boots1=gray, boots2=green, boots3=blue, boots4=purple, boots5=yellow, boots6=red
type EquipmentTier = "gray" | "green" | "blue" | "purple" | "yellow" | "red";

interface EquipmentPrices {
  chest: Record<EquipmentTier, number>;
  pants: Record<EquipmentTier, number>;
  boots: Record<EquipmentTier, number>;
}

interface PricesState {
  lootboxPrice: number;
  scrapPrice: number;
  equipmentPrices: EquipmentPrices;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const PRICES_CACHE_KEY = "warera-api-prices-v2";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Default fallback prices
const defaultEquipmentPrices: EquipmentPrices = {
  chest: { gray: 2, green: 6, blue: 22, purple: 63, yellow: 185, red: 570 },
  pants: { gray: 2, green: 6, blue: 21, purple: 63, yellow: 190, red: 550 },
  boots: { gray: 2, green: 6, blue: 21, purple: 63, yellow: 190, red: 550 },
};

export function usePrices() {
  const [state, setState] = useState<PricesState>({
    lootboxPrice: 4.5,
    scrapPrice: 0.3,
    equipmentPrices: defaultEquipmentPrices,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchPrices = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch item prices (lootbox, scrap)
      const itemPricesResponse = await fetch(
        "https://api2.warera.io/trpc/itemTrading.getPrices",
        {
          method: "GET",
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
        }
      );

      if (!itemPricesResponse.ok) {
        throw new Error(`Item prices API error: ${itemPricesResponse.status}`);
      }

      const itemData = await itemPricesResponse.json();
      const itemPrices: ItemPrices = itemData.result.data;

      // Fetch equipment prices
      // Build the batch request for all equipment
      const equipmentCodes = [
        "chest1",
        "chest2",
        "chest3",
        "chest4",
        "chest5",
        "chest6",
        "pants1",
        "pants2",
        "pants3",
        "pants4",
        "pants5",
        "boots1",
        "boots2",
        "boots3",
        "boots4",
        "boots5",
        "boots6",
      ];

      const procedures = equipmentCodes
        .map(() => "gameStat.getEquipmentAvgByCode")
        .join(",");

      const input: Record<string, { itemCode: string }> = {};
      equipmentCodes.forEach((code, index) => {
        input[index.toString()] = { itemCode: code };
      });

      const equipmentUrl = `https://api2.warera.io/trpc/${procedures}?batch=1&input=${encodeURIComponent(
        JSON.stringify(input)
      )}`;

      const equipmentResponse = await fetch(equipmentUrl, {
        method: "GET",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
      });

      let equipmentPrices = defaultEquipmentPrices;

      if (equipmentResponse.ok) {
        const equipmentData = await equipmentResponse.json();

        // Map the responses to our price structure
        // chest1-6 are indices 0-5
        // pants1-5 are indices 6-10
        // boots1-6 are indices 11-16
        equipmentPrices = {
          chest: {
            gray:
              equipmentData[0]?.result?.data ??
              defaultEquipmentPrices.chest.gray,
            green:
              equipmentData[1]?.result?.data ??
              defaultEquipmentPrices.chest.green,
            blue:
              equipmentData[2]?.result?.data ??
              defaultEquipmentPrices.chest.blue,
            purple:
              equipmentData[3]?.result?.data ??
              defaultEquipmentPrices.chest.purple,
            yellow:
              equipmentData[4]?.result?.data ??
              defaultEquipmentPrices.chest.yellow,
            red:
              equipmentData[5]?.result?.data ??
              defaultEquipmentPrices.chest.red,
          },
          pants: {
            gray: defaultEquipmentPrices.pants.gray, // No gray pants in API
            green:
              equipmentData[6]?.result?.data ??
              defaultEquipmentPrices.pants.green,
            blue:
              equipmentData[7]?.result?.data ??
              defaultEquipmentPrices.pants.blue,
            purple:
              equipmentData[8]?.result?.data ??
              defaultEquipmentPrices.pants.purple,
            yellow:
              equipmentData[9]?.result?.data ??
              defaultEquipmentPrices.pants.yellow,
            red:
              equipmentData[10]?.result?.data ??
              defaultEquipmentPrices.pants.red,
          },
          boots: {
            gray:
              equipmentData[11]?.result?.data ??
              defaultEquipmentPrices.boots.gray,
            green:
              equipmentData[12]?.result?.data ??
              defaultEquipmentPrices.boots.green,
            blue:
              equipmentData[13]?.result?.data ??
              defaultEquipmentPrices.boots.blue,
            purple:
              equipmentData[14]?.result?.data ??
              defaultEquipmentPrices.boots.purple,
            yellow:
              equipmentData[15]?.result?.data ??
              defaultEquipmentPrices.boots.yellow,
            red:
              equipmentData[16]?.result?.data ??
              defaultEquipmentPrices.boots.red,
          },
        };
      }

      const newState: PricesState = {
        lootboxPrice: itemPrices.case1,
        scrapPrice: itemPrices.scraps,
        equipmentPrices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      };

      // Cache the prices
      localStorage.setItem(
        PRICES_CACHE_KEY,
        JSON.stringify({
          ...newState,
          lastUpdated: newState.lastUpdated?.toISOString(),
        })
      );

      setState(newState);
    } catch (err) {
      console.error("Failed to fetch prices:", err);

      // Try to load from cache
      try {
        const cached = localStorage.getItem(PRICES_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setState({
            lootboxPrice: parsed.lootboxPrice,
            scrapPrice: parsed.scrapPrice,
            equipmentPrices: parsed.equipmentPrices ?? defaultEquipmentPrices,
            isLoading: false,
            error: "Using cached prices (API unavailable)",
            lastUpdated: new Date(parsed.lastUpdated),
          });
          return;
        }
      } catch {
        // Cache read failed
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch prices",
      }));
    }
  };

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(PRICES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const lastUpdated = new Date(parsed.lastUpdated);
        const age = Date.now() - lastUpdated.getTime();

        if (age < CACHE_DURATION) {
          setState({
            lootboxPrice: parsed.lootboxPrice,
            scrapPrice: parsed.scrapPrice,
            equipmentPrices: parsed.equipmentPrices ?? defaultEquipmentPrices,
            isLoading: false,
            error: null,
            lastUpdated,
          });
          return;
        }
      }
    } catch {
      // Cache read failed, fetch fresh
    }

    fetchPrices();
  }, []);

  return {
    ...state,
    refetch: fetchPrices,
  };
}
