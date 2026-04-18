import React from "react";
import { Plus, X } from "lucide-react";
import CustomButton from "../../Common/CustomButton";
import CustomInput from "../../FormFields/CustomInput";
import CustomTextArea from "../../FormFields/CustomTextArea";
import type { AdditionalInfo as AdditionalInfoType } from "./Attributes";

interface AdditionalInfoProps {
  onChange?: (info: AdditionalInfoType[]) => void;
  initialInfo?: AdditionalInfoType[];
}

const AdditionalInfo: React.FC<AdditionalInfoProps> = ({ onChange, initialInfo }) => {
  const [infoName, setInfoName] = React.useState("");
  const [infoValue, setInfoValue] = React.useState("");
  const [additionalInfo, setAdditionalInfo] = React.useState<AdditionalInfoType[]>([]);

  // Seed initial data once when edit-mode values arrive
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initializedRef.current && initialInfo && initialInfo.length > 0) {
      initializedRef.current = true;
      setAdditionalInfo(initialInfo);
    }
  }, [initialInfo]);

  const addAdditionalInfo = () => {
    if (!infoName.trim() || !infoValue.trim()) return;
    setAdditionalInfo((prev) => [
      ...prev,
      { name: infoName.trim(), value: infoValue.trim() },
    ]);
    setInfoName("");
    setInfoValue("");
  };

  const removeAdditionalInfo = (index: number) => {
    setAdditionalInfo((prev) => prev.filter((_, i) => i !== index));
  };

  React.useEffect(() => {
    if (onChange) onChange(additionalInfo);
  }, [additionalInfo]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-700">Additional Information</div>
      <div className="grid gap-3">
        <CustomInput
          label="Field Name"
          value={infoName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setInfoName(event.target.value)}
        />
        <CustomTextArea
          label="Field Value"
          value={infoValue}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setInfoValue(event.target.value)}
          rows={3}
        />
      </div>
      <CustomButton type="button" className="" leftIcon={<Plus size={16} />} onClick={addAdditionalInfo}>
        Add Info
      </CustomButton>
      <div className="space-y-2">
        {additionalInfo.map((info, index) => (
          <div key={`${info.name}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <span>
              <strong>{info.name}:</strong> {info.value}
            </span>
            <button type="button" onClick={() => removeAdditionalInfo(index)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdditionalInfo;