import { skillDefinitions } from "../constants";
import { SkillLevels } from "./SkillSelector";

export const getSkillValue = (
  skill: keyof SkillLevels,
  skillLevels: SkillLevels
) => {
  return (
    skillDefinitions[skill].initialValue +
    skillDefinitions[skill].valuePerLevel * skillLevels[skill]
  );
};
