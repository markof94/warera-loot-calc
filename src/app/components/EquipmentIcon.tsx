import Image from "next/image";
import { equipmentImages, EquipmentTier } from "../constants";

const tierBackgrounds: Record<EquipmentTier, string> = {
  gray: "bg-gray-500/40",
  green: "bg-green-500/40",
  blue: "bg-blue-500/40",
  purple: "bg-purple-500/40",
  yellow: "bg-yellow-500/40",
  red: "bg-red-500/40",
};

const EquipmentIcon = ({
  type,
  tier,
  onClick,
}: {
  type: keyof typeof equipmentImages;
  tier: EquipmentTier;
  onClick: () => void;
}) => {
  const backgroundClass = tierBackgrounds[tier];

  return (
    <div
      className={`w-20 aspect-square flex items-center justify-center rounded-md p-2 cursor-pointer ${backgroundClass}`}
    >
      <Image
        className="w-16 h-16 object-contain"
        src={equipmentImages[type]}
        alt={`${type} ${tier}`}
        width={100}
        height={100}
        onClick={onClick}
      />
    </div>
  );
};

export default EquipmentIcon;
