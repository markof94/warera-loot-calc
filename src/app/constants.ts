export const equipmentImages = {
  chest: "https://app.warera.io/images/items/chest2.png?v=17",
  pants: "https://app.warera.io/images/items/pants2.png?v=17",
  boots: "https://app.warera.io/images/items/boots2.png?v=17",
};

export const lootboxImage = "https://app.warera.io/images/items/case1.png?v=17";

export const lootboxAveragePrice = 4.5;
export const scrapAveragePrice = 0.3;

export const durabilityReductionPercentPerHit = 1;

export const maxArmorPercent = 90;

export type EquipmentTier =
  | "gray"
  | "green"
  | "blue"
  | "purple"
  | "yellow"
  | "red";

export type EquipmentType = "chest" | "pants" | "boots";

export const statRanges = {
  chest: {
    type: "armor",
    tiers: {
      gray: {
        min: 1,
        max: 5,
      },
      green: {
        min: 6,
        max: 10,
      },
      blue: {
        min: 11,
        max: 15,
      },
      purple: {
        min: 16,
        max: 20,
      },
      yellow: {
        min: 21,
        max: 30,
      },
      red: {
        min: 31,
        max: 40,
      },
    },
  },
  pants: {
    type: "armor",
    tiers: {
      gray: {
        min: 1,
        max: 5,
      },
      green: {
        min: 6,
        max: 10,
      },
      blue: {
        min: 11,
        max: 15,
      },
      purple: {
        min: 16,
        max: 20,
      },
      yellow: {
        min: 21,
        max: 30,
      },
      red: {
        min: 31,
        max: 40,
      },
    },
  },
  boots: {
    type: "dodge",
    tiers: {
      gray: {
        min: 1,
        max: 5,
      },
      green: {
        min: 6,
        max: 10,
      },
      blue: {
        min: 11,
        max: 15,
      },
      purple: {
        min: 16,
        max: 20,
      },
      yellow: {
        min: 21,
        max: 30,
      },
      red: {
        min: 31,
        max: 40,
      },
    },
  },
};

export const prices = {
  chest: {
    gray: 2,
    green: 6,
    blue: 22,
    purple: 63,
    yellow: 185,
    red: 570,
  },
  pants: {
    gray: 2,
    green: 6,
    blue: 21,
    purple: 63,
    yellow: 190,
    red: 550,
  },
  boots: {
    gray: 2,
    green: 6,
    blue: 21,
    purple: 63,
    yellow: 190,
    red: 550,
  },
};

export const skillDefinitions = {
  armor: {
    type: "armor",
    initialValue: 0,
    valuePerLevel: 4,
    label: "%",
  },
  dodge: {
    type: "dodge",
    initialValue: 0,
    valuePerLevel: 4,
    label: "%",
  },
  lootChance: {
    type: "lootChance",
    initialValue: 5,
    valuePerLevel: 1,
    label: "%",
  },
  health: {
    type: "health",
    initialValue: 50,
    valuePerLevel: 10,
    label: "",
  },
};

export const dropChancePercentages = {
  gray: 62,
  green: 30,
  blue: 7.1,
  purple: 0.85,
  yellow: 0.04,
  red: 0.01,
};

export const scrapGainedPerTier = {
  gray: 6,
  green: 18,
  blue: 54,
  purple: 162,
  yellow: 500,
  red: 1500,
};
