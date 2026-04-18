import React from 'react'
import CustomInput from '@/components/FormFields/CustomInput'
import CustomTextArea from '@/components/FormFields/CustomTextArea'
import CustomRichTextEditor from '@/components/Common/CustomRichTextEditor'

export interface BlogDetailsProps {
  title: string
  setTitle: (value: string) => void
  author: string
  setAuthor: (value: string) => void
  shortDescription: string
  setShortDescription: (value: string) => void
  content: string
  setContent: (value: string) => void
  onEditorProcessingChange?: (processing: boolean) => void
}

const Blogdetails: React.FC<BlogDetailsProps> = ({
  title,
  setTitle,
  author,
  setAuthor,
  shortDescription,
  setShortDescription,
  content,
  setContent,
  onEditorProcessingChange,
}) => {
  return (
    <>
     <div className="space-y-4">
        <CustomInput label="Title" requiredMark value={title} onChange={(e) => setTitle(e.target.value)} />

      <CustomInput label="Author" requiredMark value={author} onChange={(e) => setAuthor(e.target.value)} />

      <CustomTextArea
        label="Short Description"
        requiredMark
        value={shortDescription}
        onChange={(e) => setShortDescription(e.target.value)}
        className="min-h-24"
      />

      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">
          Content
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </div>
        <CustomRichTextEditor value={content} onChange={setContent} onProcessingChange={onEditorProcessingChange} />
      </div>
     </div>
    </>
  )
}

export default Blogdetails