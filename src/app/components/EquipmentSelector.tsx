import { EquipmentTier } from "../constants";

const EquipmentSelector = ({
  onChange,
  value,
}: {
  onChange: (value: EquipmentTier) => void;
  value: EquipmentTier;
}) => {
  return (
    <div className="w-20">
      <select
        onChange={(e) => onChange(e.target.value as EquipmentTier)}
        value={value}
        className="text-white bg-gray-800 border border-gray-700 rounded-md p-2"
      >
        <option value="gray">Gray</option>
        <option value="green">Green</option>
        <option value="blue">Blue</option>
        <option value="purple">Purple</option>
        <option value="yellow">Yellow</option>
        <option value="red">Red</option>
      </select>
    </div>
  );
};

export default EquipmentSelector;
