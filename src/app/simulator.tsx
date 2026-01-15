"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import EquipmentIcon, { EquipmentTier } from "./components/EquipmentIcon";
import EquipmentSelector from "./components/EquipmentSelector";
import SkillSelector, { SkillLevels } from "./components/SkillSelector";
import { statRanges, lootboxImage } from "./constants";
import { getSkillValue } from "./components/helper";

const BASE_DAMAGE = 10;
const HP_REGEN_PERCENT = 10; // 10% of max HP per hour

const Simulator = () => {
  const [level, setLevel] = useState(33);
  const [skillLevels, setSkillLevels] = useState<SkillLevels>({
    armor: 0,
    dodge: 0,
    lootChance: 0,
    health: 0,
  });

  const [equipment, setEquipment] = useState<{
    chest: EquipmentTier;
    pants: EquipmentTier;
    boots: EquipmentTier;
  }>({
    chest: "green",
    pants: "green",
    boots: "green",
  });

  // Simulation state
  const [currentHp, setCurrentHp] = useState<number | null>(null);
  const [lootboxes, setLootboxes] = useState(0);
  const [accumulatedLootChance, setAccumulatedLootChance] = useState(0);
  const [attackLog, setAttackLog] = useState<string[]>([]);
  const [totalAttacks, setTotalAttacks] = useState(0);

  // Batch simulation
  const [simulationAttacks, setSimulationAttacks] = useState(100);
  const [simulationHours, setSimulationHours] = useState(24);

  // Computed stats
  const maxHp = getSkillValue("health", skillLevels);
  const armorPercent =
    getSkillValue("armor", skillLevels) +
    statRanges.chest.tiers[equipment.chest].min +
    statRanges.pants.tiers[equipment.pants].min;
  const dodgePercent =
    getSkillValue("dodge", skillLevels) +
    statRanges.boots.tiers[equipment.boots].min;
  const lootChancePerAttack = getSkillValue("lootChance", skillLevels);

  // Effective HP is the actual current HP (initialize to max if null)
  const effectiveHp = currentHp ?? maxHp;

  // Damage after armor reduction
  const damageAfterArmor = Math.max(0, BASE_DAMAGE * (1 - armorPercent / 100));

  // Can attack if HP >= damage we'd take (or HP >= 10 as minimum threshold)
  const canAttack = effectiveHp >= Math.min(BASE_DAMAGE, damageAfterArmor);

  const addLog = (message: string) => {
    setAttackLog((prev) => [message, ...prev.slice(0, 49)]);
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
    const remainder = newAccumulatedLoot % 100;

    // Check for bonus box from remainder
    let bonusBox = 0;
    if (remainder > 0 && Math.random() * 100 < remainder) {
      bonusBox = 1;
    }

    const totalNewBoxes = guaranteedBoxes + bonusBox;

    if (totalNewBoxes > 0) {
      logMessage += ` | +${totalNewBoxes} lootbox${
        totalNewBoxes > 1 ? "es" : ""
      }!`;
    }

    setCurrentHp(newHp);
    setAccumulatedLootChance(newAccumulatedLoot - guaranteedBoxes * 100);
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
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
              Equipment
            </h2>
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
                  +{statRanges.chest.tiers[equipment.chest].min}% Armor
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
                  +{statRanges.pants.tiers[equipment.pants].min}% Armor
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
                  +{statRanges.boots.tiers[equipment.boots].min}% Dodge
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
          <div className="bg-gray-900 p-3 rounded-lg max-h-48 overflow-y-auto">
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
    </div>
  );
};

export default Simulator;
