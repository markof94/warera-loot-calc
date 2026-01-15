"use client";
import { useEffect, useCallback } from "react";
import { skillDefinitions } from "../constants";
import { getSkillValue } from "./helper";

export type SkillLevels = {
  armor: number;
  dodge: number;
  lootChance: number;
  health: number;
};

const SKILL_LABELS: Record<keyof SkillLevels, string> = {
  armor: "Armor",
  dodge: "Dodge",
  lootChance: "Loot Chance",
  health: "Health",
};

const POINTS_PER_LEVEL = 4;

// Calculate total cost for a skill at a given level
// Level 1 costs 1, level 2 costs 2, etc.
// Total cost for level N = 1 + 2 + ... + N = N*(N+1)/2
const calculateSkillCost = (skillLevel: number): number => {
  return (skillLevel * (skillLevel + 1)) / 2;
};

// Calculate total points spent across all skills
const calculateTotalSpent = (skillLevels: SkillLevels): number => {
  return Object.values(skillLevels).reduce(
    (total, level) => total + calculateSkillCost(level),
    0
  );
};

const SkillSelector = ({
  level,
  onSetLevel,
  skillLevels,
  onSkillLevelsChange,
}: {
  level: number;
  onSetLevel: (level: number) => void;
  skillLevels: SkillLevels;
  onSkillLevelsChange: (skillLevels: SkillLevels) => void;
}) => {
  const totalPoints = level * POINTS_PER_LEVEL;
  const usedPoints = calculateTotalSpent(skillLevels);
  const availablePoints = totalPoints - usedPoints;

  const resetSkills = useCallback(() => {
    onSkillLevelsChange({
      armor: 0,
      dodge: 0,
      lootChance: 0,
      health: 0,
    });
  }, [onSkillLevelsChange]);

  // Auto-reset if level changes and there aren't enough points
  useEffect(() => {
    if (usedPoints > totalPoints) {
      resetSkills();
    }
  }, [totalPoints, usedPoints, resetSkills]);

  const handleLevelChange = (newLevel: number) => {
    const clampedLevel = Math.max(1, Math.floor(newLevel));
    onSetLevel(clampedLevel);
  };

  const setSkillLevel = (skill: keyof SkillLevels, targetLevel: number) => {
    const currentLevel = skillLevels[skill];

    if (targetLevel === currentLevel) return;

    if (targetLevel < currentLevel) {
      // Decreasing - always allowed
      onSkillLevelsChange({
        ...skillLevels,
        [skill]: targetLevel,
      });
    } else {
      // Increasing - check if we have enough points
      const additionalCost =
        calculateSkillCost(targetLevel) - calculateSkillCost(currentLevel);
      if (availablePoints >= additionalCost) {
        onSkillLevelsChange({
          ...skillLevels,
          [skill]: targetLevel,
        });
      }
    }
  };

  // Calculate max displayable level based on total available points
  const getMaxDisplayLevel = () => {
    // Find the highest level that could theoretically be reached with all points
    let maxLevel = 0;
    while (calculateSkillCost(maxLevel + 1) <= totalPoints) {
      maxLevel++;
    }
    return Math.min(maxLevel, 10); // Show max 10 squares
  };

  const maxDisplayLevel = getMaxDisplayLevel();

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Character Level
        </label>
        <input
          type="number"
          min={1}
          value={level}
          onChange={(e) => handleLevelChange(parseInt(e.target.value) || 1)}
          className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 text-sm text-gray-300">
        <span className="font-medium">Skill Points:</span>{" "}
        <span
          className={
            availablePoints === 0 ? "text-yellow-400" : "text-green-400"
          }
        >
          {availablePoints}
        </span>{" "}
        / {totalPoints} available
      </div>

      <div className="space-y-4">
        {(Object.keys(skillLevels) as Array<keyof SkillLevels>).map((skill) => {
          const currentLevel = skillLevels[skill];
          const squares = Array.from(
            { length: maxDisplayLevel },
            (_, i) => i + 1
          );

          return (
            <div key={skill} className="bg-gray-700 p-3 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-white">
                  {SKILL_LABELS[skill]} ({getSkillValue(skill, skillLevels)}
                  {skillDefinitions[skill].label})
                </div>
                <div className="text-xs text-gray-400">
                  Level {currentLevel} ({calculateSkillCost(currentLevel)} pts)
                </div>
              </div>

              <div
                className="flex flex-wrap gap-0.5"
                style={{ maxWidth: "280px" }}
              >
                {squares.map((levelNum) => {
                  const isFilled = levelNum <= currentLevel;
                  const costToReach =
                    calculateSkillCost(levelNum) -
                    calculateSkillCost(currentLevel);
                  const canAfford = costToReach <= availablePoints;
                  const isClickable = isFilled || canAfford;

                  return (
                    <button
                      key={levelNum}
                      onClick={() => {
                        if (isFilled) {
                          // Clicking a filled square sets level to one less
                          setSkillLevel(skill, levelNum - 1);
                        } else if (canAfford) {
                          // Clicking an empty square fills up to that level
                          setSkillLevel(skill, levelNum);
                        }
                      }}
                      disabled={!isClickable}
                      className={`w-5 h-8 rounded-sm border transition-colors ${
                        isFilled
                          ? "bg-blue-500 border-blue-400 hover:bg-blue-400"
                          : canAfford
                          ? "bg-gray-600 border-gray-500 hover:bg-gray-500"
                          : "bg-gray-800 border-gray-700 cursor-not-allowed opacity-50"
                      }`}
                      title={
                        isFilled
                          ? `Level ${levelNum} (click to remove)`
                          : canAfford
                          ? `Level ${levelNum} (cost: ${costToReach} pts)`
                          : `Level ${levelNum} (need ${costToReach} pts)`
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={resetSkills}
        className="mt-4 w-full py-1 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
      >
        Reset Skills
      </button>
    </div>
  );
};

export default SkillSelector;
