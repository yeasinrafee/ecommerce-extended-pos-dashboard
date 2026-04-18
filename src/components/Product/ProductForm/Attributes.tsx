import React from "react";
import { Plus, X } from "lucide-react";
import { AiOutlineCheck } from "react-icons/ai";
import { useForm } from "react-hook-form";

import CustomButton from "../../Common/CustomButton";
import CustomInput from "../../FormFields/CustomInput";
import CustomSelect from "../../FormFields/CustomSelect";
import { useAllAttributes } from "@/hooks/attribute.api";

export type AttributeRecord = {
  name: string;
  pairs: { value: string; price: string; imageId?: string | null; existingImageUrl?: string | null }[];
};

export type AdditionalInfo = { name: string; value: string };

export interface AttributesData {
  attributes: AttributeRecord[];
  additionalInfo: AdditionalInfo[];
}

interface AttributesProps {
  onChange?: (data: AttributesData, pending?: { name: string; value?: string } | null) => void;
  galleryImages?: { id: string; name: string; url: string }[];
  initialAttributes?: AttributeRecord[];
}

const Attributes: React.FC<AttributesProps> = ({ onChange, galleryImages = [], initialAttributes }) => {
  const [attributeName, setAttributeName] = React.useState("");
  const [attributeValue, setAttributeValue] = React.useState("");
  const [attributePrice, setAttributePrice] = React.useState("");
  const [attributes, setAttributes] = React.useState<AttributeRecord[]>([]);
  const [selectedGalleryImageId, setSelectedGalleryImageId] = React.useState<string | null>(null);

  const { data: attributesList } = useAllAttributes();

  // Seed initial attributes once when edit-mode data arrives
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initializedRef.current && initialAttributes && initialAttributes.length > 0) {
      initializedRef.current = true;
      setAttributes(initialAttributes);
    }
  }, [initialAttributes]);

  const { control, setValue, reset } = useForm<{ attributeName: string; attributeValue: string }>({
    defaultValues: { attributeName: "", attributeValue: "" },
  });

  const [pendingError, setPendingError] = React.useState<string | null>(null);

  const addAttribute = () => {
    const name = attributeName.trim();
    const value = attributeValue.trim();
    if (!name || !value) {
      setPendingError("Value is required for the selected attribute");
      return;
    }

    setPendingError(null);

    const price = attributePrice.trim();
    setAttributes((prev) => {
      const exists = prev.find((attr) => attr.name === name);
      if (exists) {
        return prev.map((attr) =>
          attr.name === name
            ? {
                ...attr,
                pairs: [
                  ...attr.pairs,
                  { value, price, imageId: selectedGalleryImageId ?? null },
                ],
              }
            : attr,
        );
      }
      return [
        ...prev,
        {
          name,
          pairs: [{ value, price, imageId: selectedGalleryImageId ?? null }],
        },
      ];
    });

    setAttributeName("");
    reset({ attributeName: "", attributeValue: "" });
    setAttributePrice("");
  };

  const removeAttributePair = (attrName: string, pairIndex: number) => {
    setAttributes((prev) =>
      prev
        .map((attr) => {
          if (attr.name !== attrName) return attr;
          const remaining = attr.pairs.filter((_, index) => index !== pairIndex);
          return { ...attr, pairs: remaining };
        })
        .filter((attr) => attr.pairs.length > 0),
    );
  };

  React.useEffect(() => {
    if (onChange) {
      const pending = attributeName ? { name: attributeName, value: attributeValue } : null;
      onChange({ attributes, additionalInfo: [] }, pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, attributeName, attributeValue]);

  const selectedGalleryImage = galleryImages.find((img) => img.id === selectedGalleryImageId);

  const attributeOptions = React.useMemo(() => {
    const list = attributesList ?? [];
    return list
      .map((a) => {
        const allValues: string[] = a.values ?? [];
        const addedValues = attributes.find((ar) => ar.name === a.name)?.pairs.map((p) => p.value) ?? [];
        const remaining = allValues.filter((v) => !addedValues.includes(v));
        return { name: a.name, remainingCount: remaining.length };
      })
      .filter((x) => x.remainingCount > 0)
      .map((x) => ({ label: x.name, value: x.name }));
  }, [attributesList, attributes]);

  React.useEffect(() => {
    if (attributeName) {
      const stillAvailable = attributeOptions.some((o) => o.value === attributeName);
      if (!stillAvailable) {
        setAttributeName("");
        setAttributeValue("");
        setValue("attributeName", "");
        setValue("attributeValue", "");
        setPendingError(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeOptions, attributeName]);

  const valueOptions = React.useMemo(() => {
    const attr = (attributesList ?? []).find((a) => a.name === attributeName);
    const allValues: string[] = attr?.values ?? [];
    const addedValues = attributes.find((a) => a.name === attributeName)?.pairs.map((p) => p.value) ?? [];
    return allValues.filter((v) => !addedValues.includes(v)).map((v) => ({ label: v, value: v }));
  }, [attributesList, attributeName, attributes]);

  return (
    <div className="space-y-6">
      {galleryImages && galleryImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Gallery images</p>
            {/* <p className="text-xs text-slate-500">
              {selectedGalleryImage
                ? `Selected: ${selectedGalleryImage.name}`
                : "Choose an image before adding an attribute."}
            </p> */}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {galleryImages.map((img) => {
              const isSelected = selectedGalleryImageId === img.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelectedGalleryImageId((prev) =>
                      prev === img.id ? null : img.id,
                    )
                  }
                  className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded transition border border-slate-200 hover:brightness-95`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-md">
                        <AiOutlineCheck className="h-3 w-3 text-white" aria-hidden />
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedGalleryImage && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Image for next value:</span>
              <span className="truncate font-semibold text-slate-700">
                {selectedGalleryImage.name}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-700">Attribute</div>
        <div className="grid gap-3 md:grid-cols-3">
          <CustomSelect
            name="attributeName"
            control={control}
            label="Name"
            placeholder="Select attribute"
            options={attributeOptions}
            disabled={attributeOptions.length === 0}
            onChangeCallback={(v: string) => {
              setAttributeName(v);
              setAttributeValue("");
              setValue("attributeValue", "");
              setPendingError(null);
            }}
            className="w-full"
            triggerClassName="w-full"
          />
          <CustomSelect
            name="attributeValue"
            control={control}
            label="Value"
            placeholder="Select value"
            options={valueOptions}
            onChangeCallback={(v: string) => {
              setAttributeValue(v);
              setPendingError(null);
            }}
            disabled={!attributeName}
            className="w-full"
            triggerClassName="w-full"
          />
          <CustomInput
            label="Variant Price (optional)"
            placeholder="Base price for this variant"
            type="number"
            value={attributePrice}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setAttributePrice(event.target.value)}
            disabled={!attributeValue}
          />
        </div>
        <CustomButton
          type="button"
          className=""
          leftIcon={<Plus size={16} />}
          onClick={addAttribute}
        >
          Add Attribute
        </CustomButton>
        {pendingError ? <p className="text-xs text-destructive mt-1">{pendingError}</p> : null}
      </div>

      <div className="space-y-3">
        {attributes.map((attr) => (
          <div
            key={attr.name}
            className="rounded-2xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {attr.name}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {attr.pairs.map((pair, index) => {
                  // Resolve image: prefer imageId lookup in gallery, fall back to existingImageUrl (edit mode)
                  const pairImage = galleryImages.find((img) => img.id === pair.imageId)
                    ?? (pair.existingImageUrl ? { url: pair.existingImageUrl, name: 'Gallery image' } : null);
                  return (
                    <div
                      key={`${attr.name}-${index}`}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm"
                    >
                      {pairImage && (
                        <img
                          src={pairImage.url}
                          alt={pairImage.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      <span>
                        {pair.value}
                        {pair.price ? ` · ${pair.price}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttributePair(attr.name, index)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Attributes;
