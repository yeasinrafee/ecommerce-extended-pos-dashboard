import React from "react";
import { X } from "lucide-react";

import CustomInput from "../../FormFields/CustomInput";
import CustomTextArea from "../../FormFields/CustomTextArea";

export interface SeoData {
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string[];
}

interface SeoProps {
  onChange?: (data: SeoData) => void;
  initialData?: SeoData;
}

const Seo: React.FC<SeoProps> = ({ onChange, initialData }) => {
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [seoKeywords, setSeoKeywords] = React.useState<string[]>([]);
  const [keywordInput, setKeywordInput] = React.useState("");

  const prevDataRef = React.useRef<SeoData | null>(null);

  // Keep a stable ref to the onChange callback so effects don't re-run
  // whenever the parent re-creates the handler.
  const onChangeRef = React.useRef<typeof onChange | undefined>(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    if (!initialData) return;
    const title = initialData.metaTitle ?? "";
    const description = initialData.metaDescription ?? "";
    const keywords = initialData.seoKeywords ?? [];

    setMetaTitle((prev) => (prev === title ? prev : title));
    setMetaDescription((prev) => (prev === description ? prev : description));
    setSeoKeywords((prev) => (prev.length === keywords.length && prev.every((k, i) => k === keywords[i]) ? prev : keywords));

    // Reflect the incoming initial data as the last-known-sent data so we
    // don't immediately re-emit it back to the parent.
    prevDataRef.current = { metaTitle: title, metaDescription: description, seoKeywords: keywords };
  }, [initialData]);

  const addKeyword = (value: string) => {
    const inputs = value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    if (!inputs.length) return;
    setSeoKeywords((prev) => {
      const next = [...prev];
      inputs.forEach((keyword) => {
        if (!next.includes(keyword)) {
          next.push(keyword);
        }
      });
      return next;
    });
  };

  const handleKeywordKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addKeyword(keywordInput);
      setKeywordInput("");
    }
  };

  const handleKeywordBlur = () => {
    if (keywordInput) {
      addKeyword(keywordInput);
      setKeywordInput("");
    }
  };

  // Notify parent about changes, but debounce notifications and avoid
  // re-emitting values that were already set from `initialData`.
  React.useEffect(() => {
    const newData: SeoData = { metaTitle, metaDescription, seoKeywords };
    const prev = prevDataRef.current;
    const changed =
      !prev ||
      prev.metaTitle !== newData.metaTitle ||
      prev.metaDescription !== newData.metaDescription ||
      prev.seoKeywords.length !== newData.seoKeywords.length ||
      prev.seoKeywords.some((k, i) => k !== newData.seoKeywords[i]);

    if (!changed) return;

    const handle = setTimeout(() => {
      prevDataRef.current = newData;
      onChangeRef.current?.(newData);
    }, 200);

    return () => clearTimeout(handle);
  }, [metaTitle, metaDescription, seoKeywords]);

  return (
    <div className="space-y-5">
      <CustomInput
        label="SEO Meta Title"
        value={metaTitle}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMetaTitle(event.target.value)}
      />
      <CustomTextArea
        label="SEO Meta Description"
        value={metaDescription}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setMetaDescription(event.target.value)}
        className="min-h-35"
      />
      <div className="space-y-2">
        <CustomInput
          label="Meta Keywords"
          placeholder="Add keywords, press Enter or comma"
          value={keywordInput}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(event.target.value)}
          onKeyDown={handleKeywordKeyDown}
          onBlur={handleKeywordBlur}
        />
        <div className="flex flex-wrap gap-2">
          {seoKeywords.map((keyword) => (
            <span
              key={keyword}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm"
            >
              {keyword}
              <button
                type="button"
                onClick={() =>
                  setSeoKeywords((prev) => prev.filter((item) => item !== keyword))
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Seo;