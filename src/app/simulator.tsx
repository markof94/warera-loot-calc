"use client";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import EquipmentIcon from "./components/EquipmentIcon";
import EquipmentSelector from "./components/EquipmentSelector";
import SkillSelector, { SkillLevels } from "./components/SkillSelector";
import {
  statRanges,
  lootboxImage,
  lootboxAveragePrice,
  durabilityReductionPercentPerHit,
  prices,
  EquipmentTier,
  dropChancePercentages,
  scrapAveragePrice,
  scrapGainedPerTier,
  maxArmorPercent,
} from "./constants";
import { getSkillValue } from "./components/helper";

const BASE_DAMAGE = 10;
const HP_REGEN_PERCENT = 10; // 10% of max HP per hour

const STORAGE_KEY = "warera-calculator-state";

interface StoredState {
  level: number;
  skillLevels: SkillLevels;
  equipment: {
    chest: EquipmentTier;
    pants: EquipmentTier;
    boots: EquipmentTier;
  };
  statMode?: StatMode;
}

const defaultSkillLevels: SkillLevels = {
  armor: 0,
  dodge: 0,
  lootChance: 0,
  health: 0,
};

const defaultEquipment = {
  chest: "green" as EquipmentTier,
  pants: "green" as EquipmentTier,
  boots: "green" as EquipmentTier,
};

type StatMode = "min" | "avg" | "max";

const Simulator = () => {
  const [level, setLevel] = useState(33);
  const [skillLevels, setSkillLevels] =
    useState<SkillLevels>(defaultSkillLevels);
  const [equipment, setEquipment] = useState<{
    chest: EquipmentTier;
    pants: EquipmentTier;
    boots: EquipmentTier;
  }>(defaultEquipment);
  const [statMode, setStatMode] = useState<StatMode>("avg");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        if (typeof parsed.level === "number") {
          setLevel(parsed.level);
        }
        if (parsed.skillLevels) {
          setSkillLevels(parsed.skillLevels);
        }
        if (parsed.equipment) {
          setEquipment(parsed.equipment);
        }
        if (parsed.statMode) {
          setStatMode(parsed.statMode);
        }
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const state: StoredState = { level, skillLevels, equipment, statMode };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [level, skillLevels, equipment, statMode, isHydrated]);

  // Simulation state
  const [currentHp, setCurrentHp] = useState<number | null>(null);
  const [lootboxes, setLootboxes] = useState(0);
  const [accumulatedLootChance, setAccumulatedLootChance] = useState(0);
  const [attackLog, setAttackLog] = useState<string[]>([]);
  const [totalAttacks, setTotalAttacks] = useState(0);

  // Batch simulation
  const [simulationAttacks, setSimulationAttacks] = useState(100);
  const [simulationHours, setSimulationHours] = useState(24);

  // Daily simulation settings
  const [dailyRegenHours, setDailyRegenHours] = useState(6);
  const [dailyCycles, setDailyCycles] = useState(100);
  const [dailyResults, setDailyResults] = useState<{
    avgLootboxes: number;
    minLootboxes: number;
    maxLootboxes: number;
    stdDev: number;
    avgAttacks: number;
    avgHits: number;
    avgCombatSessions: number;
    results: number[];
  } | null>(null);
  const [isRunningDaily, setIsRunningDaily] = useState(false);

  // Computed stats
  const maxHp = getSkillValue("health", skillLevels);

  // Helper to get equipment stat based on mode
  const getEquipStat = (
    tierData: { min: number; max: number },
    mode: StatMode
  ) => {
    if (mode === "min") return tierData.min;
    if (mode === "max") return tierData.max;
    return (tierData.min + tierData.max) / 2;
  };

  const chestArmor = getEquipStat(
    statRanges.chest.tiers[equipment.chest],
    statMode
  );
  const pantsArmor = getEquipStat(
    statRanges.pants.tiers[equipment.pants],
    statMode
  );
  const bootsDodge = getEquipStat(
    statRanges.boots.tiers[equipment.boots],
    statMode
  );

  const armorPercentRaw =
    getSkillValue("armor", skillLevels) + chestArmor + pantsArmor;
  const armorPercent = Math.min(maxArmorPercent, armorPercentRaw);
  const dodgePercent = getSkillValue("dodge", skillLevels) + bootsDodge;
  const lootChancePerAttack = getSkillValue("lootChance", skillLevels);

  // Effective HP is the actual current HP (initialize to max if null)
  const effectiveHp = currentHp ?? maxHp;

  // Damage after armor reduction
  const damageAfterArmor = Math.max(0, BASE_DAMAGE * (1 - armorPercent / 100));

  // Can attack if HP >= damage we'd take (or HP >= 10 as minimum threshold)
  const canAttack = effectiveHp >= Math.min(BASE_DAMAGE, damageAfterArmor);

  const addLog = (message: string) => {
    setAttackLog((prev) => [message, ...prev.slice(0, 99)]);
  };

  const performAttack = () => {
    if (!canAttack) return;

    const hp = currentHp ?? maxHp;
    const dodged = Math.random() * 100 < dodgePercent;

    let newHp = hp;
    let logMessage = "";

    if (dodged) {
      logMessage = `Attack #${totalAttacks + 1}: Dodged!`;
    } else {
      newHp = Math.max(0, hp - damageAfterArmor);
      logMessage = `Attack #${
        totalAttacks + 1
      }: Took ${damageAfterArmor.toFixed(1)} damage (HP: ${newHp.toFixed(
        1
      )}/${maxHp})`;
    }

    // Add loot chance
    const newAccumulatedLoot = accumulatedLootChance + lootChancePerAttack;
    const guaranteedBoxes = Math.floor(newAccumulatedLoot / 100);
    let remainder = newAccumulatedLoot % 100;

    // Check for bonus box from remainder - if won, remainder is consumed
    let bonusBox = 0;
    if (remainder > 0 && Math.random() * 100 < remainder) {
      bonusBox = 1;
      remainder = 0; // Consumed the remainder chance
    }

    const totalNewBoxes = guaranteedBoxes + bonusBox;

    if (totalNewBoxes > 0) {
      logMessage += ` | +${totalNewBoxes} lootbox${
        totalNewBoxes > 1 ? "es" : ""
      }!`;
    }

    setCurrentHp(newHp);
    setAccumulatedLootChance(remainder);
    setLootboxes((prev) => prev + totalNewBoxes);
    setTotalAttacks((prev) => prev + 1);
    addLog(logMessage);
  };

  const resetSimulation = () => {
    setCurrentHp(null);
    setLootboxes(0);
    setAccumulatedLootChance(0);
    setAttackLog([]);
    setTotalAttacks(0);
  };

  const resetHpOnly = () => {
    setCurrentHp(null);
  };

  // Calculate attacks possible until HP runs out
  const attacksUntilDead = useMemo(() => {
    if (damageAfterArmor <= 0) return Infinity;
    return Math.floor(effectiveHp / damageAfterArmor);
  }, [effectiveHp, damageAfterArmor]);

  // HP regen per hour
  const hpRegenPerHour = (maxHp * HP_REGEN_PERCENT) / 100;

  // Equipment costs
  const equipmentCosts = useMemo(() => {
    const chestPrice = prices.chest[equipment.chest];
    const pantsPrice = prices.pants[equipment.pants];
    const bootsPrice = prices.boots[equipment.boots];
    const totalEquipmentPrice = chestPrice + pantsPrice + bootsPrice;

    // Average durability loss per hit (1-2%, so avg 1.5%)
    const avgDurabilityLossPerHit = durabilityReductionPercentPerHit;

    // Hits until equipment breaks (100% / loss per hit)
    const hitsUntilBreak = 100 / avgDurabilityLossPerHit;

    return {
      chestPrice,
      pantsPrice,
      bootsPrice,
      totalEquipmentPrice,
      avgDurabilityLossPerHit,
      hitsUntilBreak,
    };
  }, [equipment]);

  // Profitability calculations based on daily results
  const profitability = useMemo(() => {
    if (!dailyResults) return null;

    const avgHitsPerDay = dailyResults.avgHits;
    const avgLootboxesPerDay = dailyResults.avgLootboxes;

    // Income from lootboxes
    const dailyLootboxIncome = avgLootboxesPerDay * lootboxAveragePrice;

    // Equipment sets consumed per day
    // Each piece of equipment breaks after hitsUntilBreak hits
    // Dodged attacks don't reduce durability, so we use hits not attacks
    const equipmentSetsPerDay = avgHitsPerDay / equipmentCosts.hitsUntilBreak;

    // Cost breakdown per equipment piece
    const chestCostPerDay = equipmentSetsPerDay * equipmentCosts.chestPrice;
    const pantsCostPerDay = equipmentSetsPerDay * equipmentCosts.pantsPrice;
    const bootsCostPerDay = equipmentSetsPerDay * equipmentCosts.bootsPrice;
    const totalEquipmentCostPerDay =
      chestCostPerDay + pantsCostPerDay + bootsCostPerDay;

    // Net profit
    const netProfitPerDay = dailyLootboxIncome - totalEquipmentCostPerDay;

    return {
      dailyLootboxIncome,
      equipmentSetsPerDay,
      chestCostPerDay,
      pantsCostPerDay,
      bootsCostPerDay,
      totalEquipmentCostPerDay,
      netProfitPerDay,
      // Break-even metrics
      lootboxesToBreakEven: totalEquipmentCostPerDay / lootboxAveragePrice,
      profitMargin:
        dailyLootboxIncome > 0
          ? (netProfitPerDay / dailyLootboxIncome) * 100
          : 0,
    };
  }, [dailyResults, equipmentCosts]);

  // Lootbox value analysis - compare selling vs opening
  const lootboxAnalysis = useMemo(() => {
    const tiers: EquipmentTier[] = [
      "gray",
      "green",
      "blue",
      "purple",
      "yellow",
      "red",
    ];

    // Calculate expected value per lootbox when selling items
    // Assumption: each lootbox drops 1 item, random type (chest/pants/boots)
    let expectedValuePerLootbox = 0;
    let expectedScrapPerLootbox = 0;
    const tierBreakdown: {
      tier: EquipmentTier;
      chance: number;
      avgPrice: number;
      scrapGained: number;
      scrapValue: number;
      contribution: number;
    }[] = [];

    for (const tier of tiers) {
      const chance = dropChancePercentages[tier] / 100;
      const avgPrice =
        (prices.chest[tier] + prices.pants[tier] + prices.boots[tier]) / 3;
      const contribution = chance * avgPrice;
      expectedValuePerLootbox += contribution;

      const scrapGained = scrapGainedPerTier[tier];
      const scrapValue = scrapGained * scrapAveragePrice;
      expectedScrapPerLootbox += chance * scrapValue;

      tierBreakdown.push({
        tier,
        chance: dropChancePercentages[tier],
        avgPrice,
        scrapGained,
        scrapValue,
        contribution,
      });
    }

    // Recycle value: expected savings from items matching your equipment tier
    // If you get an item of your tier, you save the cost of buying it
    const recycleChancePerTier = {
      chest: dropChancePercentages[equipment.chest] / 100 / 6, // 1/6 chance it's the right type
      pants: dropChancePercentages[equipment.pants] / 100 / 6,
      boots: dropChancePercentages[equipment.boots] / 100 / 6,
    };

    const recycleSavingsPerLootbox =
      recycleChancePerTier.chest * prices.chest[equipment.chest] +
      recycleChancePerTier.pants * prices.pants[equipment.pants] +
      recycleChancePerTier.boots * prices.boots[equipment.boots];

    // Scrap value of items that would be recycled (kept for use)
    const recycleScrapValue =
      recycleChancePerTier.chest *
        scrapGainedPerTier[equipment.chest] *
        scrapAveragePrice +
      recycleChancePerTier.pants *
        scrapGainedPerTier[equipment.pants] *
        scrapAveragePrice +
      recycleChancePerTier.boots *
        scrapGainedPerTier[equipment.boots] *
        scrapAveragePrice;

    // Expected items per lootbox that you can use
    const usableItemChancePerLootbox =
      recycleChancePerTier.chest +
      recycleChancePerTier.pants +
      recycleChancePerTier.boots;

    return {
      sellDirectValue: lootboxAveragePrice,
      expectedItemValue: expectedValuePerLootbox,
      expectedScrapValue: expectedScrapPerLootbox,
      recycleSavingsPerLootbox,
      recycleScrapValue,
      usableItemChancePerLootbox,
      tierBreakdown,
      // Which strategy is best?
      bestStrategy:
        expectedValuePerLootbox > lootboxAveragePrice
          ? "open_and_sell"
          : "sell_direct",
      valueDifference: expectedValuePerLootbox - lootboxAveragePrice,
      scrapDifference: expectedScrapPerLootbox - lootboxAveragePrice,
    };
  }, [equipment]);

  // Combined profitability with all strategies
  const strategyComparison = useMemo(() => {
    if (!dailyResults || !profitability) return null;

    const avgLootboxesPerDay = dailyResults.avgLootboxes;
    const equipCost = profitability.totalEquipmentCostPerDay;

    // Strategy 1: Sell lootboxes directly
    const sellDirectIncome = avgLootboxesPerDay * lootboxAveragePrice;
    const sellDirectProfit = sellDirectIncome - equipCost;

    // Strategy 2: Open and sell items
    const openAndSellIncome =
      avgLootboxesPerDay * lootboxAnalysis.expectedItemValue;
    const openAndSellProfit = openAndSellIncome - equipCost;

    // Strategy 3: Open and recycle (use items you need, sell rest)
    // This reduces your equipment cost
    const recycledSavings =
      avgLootboxesPerDay * lootboxAnalysis.recycleSavingsPerLootbox;
    const effectiveEquipCost = Math.max(0, equipCost - recycledSavings);

    // Items you can't use are sold
    // Sell value of non-usable items = total item value - value of items you keep
    const totalItemValue =
      avgLootboxesPerDay * lootboxAnalysis.expectedItemValue;
    const keptItemValue =
      avgLootboxesPerDay * lootboxAnalysis.recycleSavingsPerLootbox;
    const sellableItemValue = totalItemValue - keptItemValue;

    const recycleProfit = sellableItemValue - effectiveEquipCost;

    // Strategy 4: Open and scrap all items
    const scrapIncome = avgLootboxesPerDay * lootboxAnalysis.expectedScrapValue;
    const scrapProfit = scrapIncome - equipCost;

    // Strategy 5: Open, recycle usable, scrap unused
    // Scrap value of non-usable items (total scrap - scrap value of items we keep)
    const totalScrapValue =
      avgLootboxesPerDay * lootboxAnalysis.expectedScrapValue;
    const keptItemScrapValue =
      avgLootboxesPerDay * lootboxAnalysis.recycleScrapValue;
    const scrappedUnusedValue = totalScrapValue - keptItemScrapValue;
    const recycleScrapProfit = scrappedUnusedValue - effectiveEquipCost;

    // Find best strategy
    const strategies = [
      {
        name: "Sell Lootboxes",
        profit: sellDirectProfit,
        income: sellDirectIncome,
      },
      {
        name: "Open & Sell Items",
        profit: openAndSellProfit,
        income: openAndSellIncome,
      },
      {
        name: "Open & Recycle",
        profit: recycleProfit,
        income: sellableItemValue,
      },
      {
        name: "Open & Scrap",
        profit: scrapProfit,
        income: scrapIncome,
      },
      {
        name: "Recycle & Scrap",
        profit: recycleScrapProfit,
        income: scrappedUnusedValue,
      },
    ];
    const bestStrategy = strategies.reduce((a, b) =>
      a.profit > b.profit ? a : b
    );

    return {
      sellDirect: {
        income: sellDirectIncome,
        cost: equipCost,
        profit: sellDirectProfit,
      },
      openAndSell: {
        income: openAndSellIncome,
        cost: equipCost,
        profit: openAndSellProfit,
      },
      recycle: {
        income: sellableItemValue,
        savedOnEquip: recycledSavings,
        effectiveCost: effectiveEquipCost,
        profit: recycleProfit,
      },
      scrap: {
        income: scrapIncome,
        cost: equipCost,
        profit: scrapProfit,
      },
      recycleScrap: {
        income: scrappedUnusedValue,
        savedOnEquip: recycledSavings,
        effectiveCost: effectiveEquipCost,
        profit: recycleScrapProfit,
      },
      bestStrategy,
      avgUsableItemsPerDay:
        avgLootboxesPerDay * lootboxAnalysis.usableItemChancePerLootbox,
    };
  }, [dailyResults, profitability, lootboxAnalysis]);

  // Simulate HP regeneration over hours
  const runHpRegen = () => {
    const hours = simulationHours;
    const hp = currentHp ?? maxHp;
    const totalRegen = hpRegenPerHour * hours;
    const newHp = Math.min(maxHp, hp + totalRegen);
    const actualRegen = newHp - hp;

    setCurrentHp(newHp);
    addLog(
      `Regen ${hours}h: +${actualRegen.toFixed(1)} HP (${hp.toFixed(
        1
      )} -> ${newHp.toFixed(1)})`
    );
  };

  // Run N attacks simulation
  const runNAttacks = () => {
    let hp = currentHp ?? maxHp;
    let loot = accumulatedLootChance;
    let boxes = 0;
    let attacks = 0;
    const dodge = dodgePercent / 100;
    const dmg = damageAfterArmor;

    for (let i = 0; i < simulationAttacks; i++) {
      if (hp < Math.min(BASE_DAMAGE, dmg)) break;

      const dodged = Math.random() < dodge;
      if (!dodged) {
        hp = Math.max(0, hp - dmg);
      }

      loot += lootChancePerAttack;
      const guaranteed = Math.floor(loot / 100);
      loot = loot % 100;

      // Roll for remainder
      if (loot > 0 && Math.random() * 100 < loot) {
        boxes += 1;
        loot = 0;
      }
      boxes += guaranteed;
      attacks++;
    }

    setCurrentHp(hp);
    setAccumulatedLootChance(loot);
    setLootboxes((prev) => prev + boxes);
    setTotalAttacks((prev) => prev + attacks);
    addLog(
      `Batch: ${attacks} attacks, +${boxes} lootboxes, HP: ${hp.toFixed(
        1
      )}/${maxHp}`
    );
  };

  // Simulate a single combat session (attack until HP depleted)
  const simulateCombatSession = (
    startHp: number,
    startLoot: number,
    dodge: number,
    dmg: number,
    lootPerAttack: number,
    minHp: number
  ): {
    endHp: number;
    endLoot: number;
    lootboxes: number;
    attacks: number;
    hits: number;
  } => {
    let hp = startHp;
    let loot = startLoot;
    let boxes = 0;
    let attacks = 0;
    let hits = 0;

    while (hp >= minHp) {
      const dodged = Math.random() < dodge;
      if (!dodged) {
        hp = Math.max(0, hp - dmg);
        hits++; // Only count as hit if not dodged (durability loss)
      }

      loot += lootPerAttack;
      const guaranteed = Math.floor(loot / 100);
      loot = loot % 100;

      // Roll for remainder
      if (loot > 0 && Math.random() * 100 < loot) {
        boxes += 1;
        loot = 0;
      }
      boxes += guaranteed;
      attacks++;

      // Stop if we can't attack anymore
      if (hp < minHp) break;
    }

    return { endHp: hp, endLoot: loot, lootboxes: boxes, attacks, hits };
  };

  // Simulate one full 24-hour day
  const simulateOneDay = (): {
    lootboxes: number;
    attacks: number;
    hits: number;
    sessions: number;
  } => {
    const dodge = dodgePercent / 100;
    const dmg = damageAfterArmor;
    const minHp = Math.min(BASE_DAMAGE, dmg);
    const regenPerHour = (maxHp * HP_REGEN_PERCENT) / 100;

    let totalLootboxes = 0;
    let totalAttacks = 0;
    let totalHits = 0;
    let sessions = 0;
    let currentLoot = 0;
    let hp = maxHp;
    let hoursElapsed = 0;

    // Run combat sessions with regen breaks until 24 hours
    while (hoursElapsed < 24) {
      // Combat session
      if (hp >= minHp) {
        const result = simulateCombatSession(
          hp,
          currentLoot,
          dodge,
          dmg,
          lootChancePerAttack,
          minHp
        );
        hp = result.endHp;
        currentLoot = result.endLoot;
        totalLootboxes += result.lootboxes;
        totalAttacks += result.attacks;
        totalHits += result.hits;
        sessions++;
      }

      // Regen for dailyRegenHours (or remaining time if less)
      const regenTime = Math.min(dailyRegenHours, 24 - hoursElapsed);
      if (regenTime <= 0) break;

      hp = Math.min(maxHp, hp + regenPerHour * regenTime);
      hoursElapsed += regenTime;
    }

    return {
      lootboxes: totalLootboxes,
      attacks: totalAttacks,
      hits: totalHits,
      sessions,
    };
  };

  // Run the full daily simulation
  const runDailySimulation = () => {
    setIsRunningDaily(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const results: number[] = [];
      let totalAttacks = 0;
      let totalHits = 0;
      let totalSessions = 0;

      for (let i = 0; i < dailyCycles; i++) {
        const dayResult = simulateOneDay();
        results.push(dayResult.lootboxes);
        totalAttacks += dayResult.attacks;
        totalHits += dayResult.hits;
        totalSessions += dayResult.sessions;
      }

      const sum = results.reduce((a, b) => a + b, 0);
      const avg = sum / results.length;
      const min = Math.min(...results);
      const max = Math.max(...results);
      const variance =
        results.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
        results.length;
      const stdDev = Math.sqrt(variance);

      const avgHitsPerDay = totalHits / dailyCycles;
      const avgAttacksPerDay = totalAttacks / dailyCycles;

      setDailyResults({
        avgLootboxes: avg,
        minLootboxes: min,
        maxLootboxes: max,
        stdDev,
        avgAttacks: avgAttacksPerDay,
        avgHits: avgHitsPerDay,
        avgCombatSessions: totalSessions / dailyCycles,
        results,
      });

      // Calculate profitability for logs
      const avgDurabilityLoss = durabilityReductionPercentPerHit;
      const hitsUntilBreak = 100 / avgDurabilityLoss;
      const equipmentSetsPerDay = avgHitsPerDay / hitsUntilBreak;

      const chestPrice = prices.chest[equipment.chest];
      const pantsPrice = prices.pants[equipment.pants];
      const bootsPrice = prices.boots[equipment.boots];

      const dailyIncome = avg * lootboxAveragePrice;
      const dailyEquipCost =
        equipmentSetsPerDay * (chestPrice + pantsPrice + bootsPrice);
      const dailyProfit = dailyIncome - dailyEquipCost;

      // Add detailed logs
      addLog("─────────────────────────────");
      addLog(
        `PROFIT: ${dailyProfit >= 0 ? "+" : ""}$${dailyProfit.toFixed(2)}/day`
      );
      addLog(
        `  Equipment cost: -$${dailyEquipCost.toFixed(
          2
        )} (${equipmentSetsPerDay.toFixed(2)} sets)`
      );
      addLog(`  Lootbox income: +$${dailyIncome.toFixed(2)}`);
      addLog("─────────────────────────────");
      addLog(
        `  Dodge rate: ${(
          ((avgAttacksPerDay - avgHitsPerDay) / avgAttacksPerDay) *
          100
        ).toFixed(1)}%`
      );
      addLog(`  Avg hits/day: ${avgHitsPerDay.toFixed(1)} (durability loss)`);
      addLog(`  Avg attacks/day: ${avgAttacksPerDay.toFixed(1)}`);
      addLog(`  Sessions/day: ${(totalSessions / dailyCycles).toFixed(1)}`);
      addLog("─────────────────────────────");
      addLog(`  Range: ${min} - ${max} lootboxes`);
      addLog(`  Std dev: ±${stdDev.toFixed(2)}`);
      addLog(`Daily Sim: ${dailyCycles} days, avg ${avg.toFixed(2)} lootboxes`);
      addLog("═══════════════════════════════");

      setIsRunningDaily(false);
    }, 10);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Skills */}
        <div>
          <SkillSelector
            level={level}
            onSetLevel={setLevel}
            skillLevels={skillLevels}
            onSkillLevelsChange={setSkillLevels}
          />
        </div>

        {/* Middle Column - Equipment & Stats */}
        <div className="space-y-4">
          {/* Equipment */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Equipment
              </h2>
              <div className="flex gap-1 text-xs">
                {(["min", "avg", "max"] as StatMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStatMode(mode)}
                    className={`px-2 py-1 rounded transition-colors ${
                      statMode === mode
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="flex flex-col items-center gap-2">
                <EquipmentIcon
                  type="chest"
                  tier={equipment.chest}
                  onClick={() => setEquipment({ ...equipment, chest: "blue" })}
                />
                <EquipmentSelector
                  value={equipment.chest as EquipmentTier}
                  onChange={(value: EquipmentTier) =>
                    setEquipment({ ...equipment, chest: value })
                  }
                />
                <div className="text-xs text-gray-500">
                  +{chestArmor}% Armor ({statMode})
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <EquipmentIcon
                  type="pants"
                  tier={equipment.pants}
                  onClick={() => setEquipment({ ...equipment, pants: "blue" })}
                />
                <EquipmentSelector
                  value={equipment.pants as EquipmentTier}
                  onChange={(value: EquipmentTier) =>
                    setEquipment({ ...equipment, pants: value })
                  }
                />
                <div className="text-xs text-gray-500">
                  +{pantsArmor}% Armor ({statMode})
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <EquipmentIcon
                  type="boots"
                  tier={equipment.boots}
                  onClick={() => setEquipment({ ...equipment, boots: "blue" })}
                />
                <EquipmentSelector
                  value={equipment.boots as EquipmentTier}
                  onChange={(value: EquipmentTier) =>
                    setEquipment({ ...equipment, boots: value })
                  }
                />
                <div className="text-xs text-gray-500">
                  +{bootsDodge}% Dodge ({statMode})
                </div>
              </div>
            </div>
          </div>

          {/* Character Stats */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
              Character Stats
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Max Health</td>
                  <td className="py-3 text-right font-medium text-white">
                    {maxHp}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Armor</td>
                  <td className="py-3 text-right font-medium text-white">
                    {armorPercent}%
                    {armorPercentRaw > maxArmorPercent && (
                      <span className="text-xs text-yellow-400 ml-1">
                        (capped)
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Dodge</td>
                  <td className="py-3 text-right font-medium text-white">
                    {dodgePercent}%
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Loot Chance</td>
                  <td className="py-3 text-right font-medium text-blue-400">
                    +{lootChancePerAttack}%/attack
                  </td>
                </tr>
              </tbody>
            </table>

            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-6 mb-4">
              Combat Info
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Base Damage</td>
                  <td className="py-3 text-right font-medium text-white">
                    {BASE_DAMAGE}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Damage Taken</td>
                  <td className="py-3 text-right font-medium text-red-400">
                    {damageAfterArmor.toFixed(1)}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">Attacks to Death</td>
                  <td className="py-3 text-right font-medium text-white">
                    {attacksUntilDead === Infinity ? "∞" : attacksUntilDead}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-400">HP Regen/Hour</td>
                  <td className="py-3 text-right font-medium text-green-400">
                    +{hpRegenPerHour.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Simulation */}
        <div className="space-y-4">
          {/* Lootboxes - Central Focus */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-4 bg-gradient-to-br from-purple-900 to-purple-700 px-8 py-4 rounded-xl shadow-lg">
              <Image
                src={lootboxImage}
                alt="Lootbox"
                width={64}
                height={64}
                className="object-contain"
              />
              <div className="text-left">
                <div className="text-gray-300 text-xs uppercase tracking-wide">
                  Lootboxes Found
                </div>
                <div className="text-5xl font-bold text-purple-300">
                  {lootboxes}
                </div>
                <div className="text-xs text-purple-200">
                  {accumulatedLootChance.toFixed(1)}% to next
                </div>
              </div>
            </div>
          </div>

          {/* Current HP */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Current HP</span>
              <span className="text-sm text-gray-500">
                {totalAttacks} attacks
              </span>
            </div>
            <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-all ${
                  effectiveHp < maxHp * 0.3
                    ? "bg-red-500"
                    : effectiveHp < maxHp * 0.6
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${(effectiveHp / maxHp) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {effectiveHp.toFixed(1)} / {maxHp}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={performAttack}
                disabled={!canAttack}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium text-sm"
              >
                Attack
              </button>
              <button
                onClick={resetHpOnly}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors text-sm"
              >
                Heal
              </button>
              <button
                onClick={resetSimulation}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors text-sm"
              >
                Reset
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Batch Actions
              </div>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="number"
                  min={1}
                  value={simulationAttacks}
                  onChange={(e) =>
                    setSimulationAttacks(parseInt(e.target.value) || 1)
                  }
                  className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <button
                  onClick={runNAttacks}
                  disabled={!canAttack}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm"
                >
                  Run Attacks
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  value={simulationHours}
                  onChange={(e) =>
                    setSimulationHours(parseInt(e.target.value) || 1)
                  }
                  className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <button
                  onClick={runHpRegen}
                  className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
                >
                  Regen Hours
                </button>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="bg-gray-900 p-3 rounded-lg max-h-72 overflow-y-auto">
            <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Activity Log
            </h3>
            {attackLog.length === 0 ? (
              <div className="text-xs text-gray-600 italic">
                No actions yet...
              </div>
            ) : (
              <div className="space-y-1">
                {attackLog.map((log, i) => (
                  <div key={i} className="text-xs text-gray-400 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Simulation Section - Full Width */}
      <div className="mt-6 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">
          Daily Lootbox Simulation
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Simulates full 24-hour cycles: attack until HP depleted, regen for
          specified hours, repeat.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-400 w-32">Regen Hours:</label>
              <input
                type="number"
                min={1}
                max={12}
                value={dailyRegenHours}
                onChange={(e) =>
                  setDailyRegenHours(
                    Math.max(1, Math.min(12, parseInt(e.target.value) || 6))
                  )
                }
                className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <span className="text-xs text-gray-500">
                hours between sessions
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-400 w-32">
                Simulation Days:
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={dailyCycles}
                onChange={(e) =>
                  setDailyCycles(
                    Math.max(
                      1,
                      Math.min(10000, parseInt(e.target.value) || 100)
                    )
                  )
                }
                className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <span className="text-xs text-gray-500">days to simulate</span>
            </div>

            <div className="text-xs text-gray-500 bg-gray-900 p-3 rounded">
              <div>Sessions per day: ~{Math.floor(24 / dailyRegenHours)}</div>
              <div>Total simulated days: {dailyCycles}</div>
            </div>

            <button
              onClick={runDailySimulation}
              disabled={isRunningDaily}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isRunningDaily
                ? "Running Simulation..."
                : "Run Daily Simulation"}
            </button>
          </div>

          {/* Results */}
          <div>
            {dailyResults ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-4 rounded-lg text-center">
                  <div className="text-xs text-purple-200 uppercase tracking-wide">
                    Average Lootboxes / Day
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {dailyResults.avgLootboxes.toFixed(2)}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Min</td>
                      <td className="py-2 text-right font-medium text-white">
                        {dailyResults.minLootboxes}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Max</td>
                      <td className="py-2 text-right font-medium text-white">
                        {dailyResults.maxLootboxes}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Std Deviation</td>
                      <td className="py-2 text-right font-medium text-yellow-400">
                        ±{dailyResults.stdDev.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Avg Attacks/Day</td>
                      <td className="py-2 text-right font-medium text-blue-400">
                        {dailyResults.avgAttacks.toFixed(1)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Avg Hits/Day</td>
                      <td className="py-2 text-right font-medium text-red-400">
                        {dailyResults.avgHits.toFixed(1)}
                        <span className="text-xs text-gray-500 ml-1">
                          (
                          {(
                            (dailyResults.avgHits / dailyResults.avgAttacks) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 text-gray-400">Avg Sessions/Day</td>
                      <td className="py-2 text-right font-medium text-green-400">
                        {dailyResults.avgCombatSessions.toFixed(1)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Distribution visualization */}
                <div className="bg-gray-900 p-3 rounded">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Distribution (last{" "}
                    {Math.min(50, dailyResults.results.length)} days)
                  </div>
                  <div className="flex items-end gap-0.5 h-16">
                    {dailyResults.results.slice(-50).map((val, i) => {
                      const height =
                        dailyResults.maxLootboxes > 0
                          ? (val / dailyResults.maxLootboxes) * 100
                          : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-purple-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                          style={{ height: `${height}%` }}
                          title={`Day ${i + 1}: ${val} lootboxes`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Run simulation to see results
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Comparison Section */}
      {strategyComparison && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-200 mb-2">
            Lootbox Strategy Comparison
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Compare selling lootboxes directly vs opening them for items
          </p>

          {/* Per-Lootbox Value Analysis */}
          <div className="mb-6 bg-gray-900 p-4 rounded-lg">
            <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">
              Value Per Lootbox
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Sell Lootbox</div>
                <div className="text-xl font-bold text-purple-400">
                  ${lootboxAveragePrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sell Items</div>
                <div className="text-xl font-bold text-blue-400">
                  ${lootboxAnalysis.expectedItemValue.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Scrap Value</div>
                <div className="text-xl font-bold text-orange-400">
                  ${lootboxAnalysis.expectedScrapValue.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Recycle Savings</div>
                <div className="text-xl font-bold text-yellow-400">
                  ${lootboxAnalysis.recycleSavingsPerLootbox.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Best vs Sell</div>
                <div
                  className={`text-xl font-bold ${
                    Math.max(
                      lootboxAnalysis.valueDifference,
                      lootboxAnalysis.scrapDifference
                    ) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.max(
                    lootboxAnalysis.valueDifference,
                    lootboxAnalysis.scrapDifference
                  ) >= 0
                    ? "+"
                    : ""}
                  $
                  {Math.max(
                    lootboxAnalysis.valueDifference,
                    lootboxAnalysis.scrapDifference
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Drop rate breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Drop Rates & Values (Item Price / Scrap Value)
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                {lootboxAnalysis.tierBreakdown.map((t) => (
                  <div
                    key={t.tier}
                    className={`text-center p-2 rounded ${
                      t.tier === "gray"
                        ? "bg-gray-700"
                        : t.tier === "green"
                        ? "bg-green-900/30"
                        : t.tier === "blue"
                        ? "bg-blue-900/30"
                        : t.tier === "purple"
                        ? "bg-purple-900/30"
                        : t.tier === "yellow"
                        ? "bg-yellow-900/30"
                        : "bg-red-900/30"
                    }`}
                  >
                    <div className="capitalize font-medium">{t.tier}</div>
                    <div className="text-gray-400">{t.chance}%</div>
                    <div className="text-blue-300">
                      ${t.avgPrice.toFixed(0)}
                    </div>
                    <div className="text-orange-300">
                      {t.scrapGained}s (${t.scrapValue.toFixed(1)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Strategy Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Strategy 1: Sell Lootboxes */}
            <div
              className={`p-4 rounded-lg border-2 ${
                strategyComparison.bestStrategy.name === "Sell Lootboxes"
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-200">Sell Lootboxes</h4>
                {strategyComparison.bestStrategy.name === "Sell Lootboxes" && (
                  <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Income</span>
                  <span className="text-green-400">
                    +${strategyComparison.sellDirect.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equipment</span>
                  <span className="text-red-400">
                    -${strategyComparison.sellDirect.cost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span
                      className={
                        strategyComparison.sellDirect.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {strategyComparison.sellDirect.profit >= 0 ? "+" : ""}$
                      {strategyComparison.sellDirect.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy 2: Open & Sell Items */}
            <div
              className={`p-4 rounded-lg border-2 ${
                strategyComparison.bestStrategy.name === "Open & Sell Items"
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-200">Open & Sell Items</h4>
                {strategyComparison.bestStrategy.name ===
                  "Open & Sell Items" && (
                  <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Item Sales</span>
                  <span className="text-green-400">
                    +${strategyComparison.openAndSell.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equipment</span>
                  <span className="text-red-400">
                    -${strategyComparison.openAndSell.cost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span
                      className={
                        strategyComparison.openAndSell.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {strategyComparison.openAndSell.profit >= 0 ? "+" : ""}$
                      {strategyComparison.openAndSell.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy 3: Open & Recycle */}
            <div
              className={`p-4 rounded-lg border-2 ${
                strategyComparison.bestStrategy.name === "Open & Recycle"
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-200">Open & Recycle</h4>
                {strategyComparison.bestStrategy.name === "Open & Recycle" && (
                  <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sell Unused</span>
                  <span className="text-green-400">
                    +${strategyComparison.recycle.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Saved on Equip</span>
                  <span className="text-yellow-400">
                    +${strategyComparison.recycle.savedOnEquip.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Net Equip Cost</span>
                  <span className="text-red-400">
                    -${strategyComparison.recycle.effectiveCost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span
                      className={
                        strategyComparison.recycle.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {strategyComparison.recycle.profit >= 0 ? "+" : ""}$
                      {strategyComparison.recycle.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                ~{strategyComparison.avgUsableItemsPerDay.toFixed(2)} usable
                items/day
              </div>
            </div>

            {/* Strategy 4: Open & Scrap */}
            <div
              className={`p-4 rounded-lg border-2 ${
                strategyComparison.bestStrategy.name === "Open & Scrap"
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-200">Open & Scrap</h4>
                {strategyComparison.bestStrategy.name === "Open & Scrap" && (
                  <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Scrap Sales</span>
                  <span className="text-orange-400">
                    +${strategyComparison.scrap.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equipment</span>
                  <span className="text-red-400">
                    -${strategyComparison.scrap.cost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span
                      className={
                        strategyComparison.scrap.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {strategyComparison.scrap.profit >= 0 ? "+" : ""}$
                      {strategyComparison.scrap.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Scrap price: ${scrapAveragePrice}/unit
              </div>
            </div>

            {/* Strategy 5: Recycle & Scrap */}
            <div
              className={`p-4 rounded-lg border-2 ${
                strategyComparison.bestStrategy.name === "Recycle & Scrap"
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-200">Recycle & Scrap</h4>
                {strategyComparison.bestStrategy.name === "Recycle & Scrap" && (
                  <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                    BEST
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Scrap Unused</span>
                  <span className="text-orange-400">
                    +${strategyComparison.recycleScrap.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Saved on Equip</span>
                  <span className="text-yellow-400">
                    +${strategyComparison.recycleScrap.savedOnEquip.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Net Equip Cost</span>
                  <span className="text-red-400">
                    -${strategyComparison.recycleScrap.effectiveCost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span
                      className={
                        strategyComparison.recycleScrap.profit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {strategyComparison.recycleScrap.profit >= 0 ? "+" : ""}$
                      {strategyComparison.recycleScrap.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Use matching items, scrap rest
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulator;
