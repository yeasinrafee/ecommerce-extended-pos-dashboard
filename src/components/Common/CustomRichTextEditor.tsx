"use client";
import * as React from "react";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  IconColumnInsertRight,
  IconPhoto,
  IconRowInsertBottom,
  IconTable,
  IconTableMinus,
} from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import { uploadImageFromEditor, deleteUploadedImage } from "@/lib/uploadImage";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onProcessingChange?: (processing: boolean) => void;
}

interface EditorControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function EditorControlButton({
  label,
  onClick,
  disabled = false,
  active = false,
  children,
}: EditorControlButtonProps) {
  return (
    <RichTextEditor.Control
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      active={active}
    >
      {children}
    </RichTextEditor.Control>
  );
}

export default function CustomRichTextEditor({ value, onChange, onProcessingChange }: EditorProps) {
  const prevImageSrcsRef = React.useRef<Set<string>>(new Set());
  const srcToPublicIdRef = React.useRef<Map<string, string>>(new Map());
  const pendingUploadsRef = React.useRef<
    Record<
      string,
      {
        promise: Promise<{ url: string; publicId: string | null }>;
        cancelled: boolean;
      }
    >
  >({});
  const pendingDeletionsRef = React.useRef<Record<string, Promise<any>>>({});
  const processingStateRef = React.useRef(false);  const isSettingContentRef = React.useRef(false);  const reportProcessingState = React.useCallback(() => {
    const hasPending =
      Object.keys(pendingUploadsRef.current).length > 0 ||
      Object.keys(pendingDeletionsRef.current).length > 0;
    if (processingStateRef.current === hasPending) {
      return;
    }
    processingStateRef.current = hasPending;
    onProcessingChange?.(hasPending);
  }, [onProcessingChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {},
        orderedList: {},
      }),
      Underline,
      Highlight,
      Code,
      CodeBlock,
      TextStyle,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
  });

  React.useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      try {
        const currentSrcs = new Set<string>();
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "image" && node.attrs && node.attrs.src) {
            currentSrcs.add(node.attrs.src);
          }
          return true;
        });

        // mark pending uploads cancelled if their temp url no longer exists
        for (const tempUrl of Object.keys(pendingUploadsRef.current)) {
          if (!currentSrcs.has(tempUrl)) {
            pendingUploadsRef.current[tempUrl].cancelled = true;
          }
        }

        // detect removed images and delete their cloud asset (publicId or URL)
        const prev = prevImageSrcsRef.current;
        if (!isSettingContentRef.current) {
          for (const s of prev) {
            if (!currentSrcs.has(s)) {
              // skip local preview URLs created via URL.createObjectURL / data URIs
              if (typeof s === "string" && (s.startsWith("blob:") || s.startsWith("data:"))) {
                if (srcToPublicIdRef.current.has(s)) {
                  srcToPublicIdRef.current.delete(s);
                }
                continue;
              }

              const pid = srcToPublicIdRef.current.get(s);
              // track deletion so callers can know editor is processing
              try {
                const deleteKey = `del:${pid ?? s}`;
                const delPromise = deleteUploadedImage(pid ?? s)
                  .catch((err) => console.warn("Failed to cleanup removed editor image", err))
                  .finally(() => {
                    delete pendingDeletionsRef.current[deleteKey];
                    reportProcessingState();
                  });
                pendingDeletionsRef.current[deleteKey] = delPromise;
                reportProcessingState();
              } catch (err) {
                console.warn("Failed to initiate deletion for removed editor image", err);
              }

              if (pid) srcToPublicIdRef.current.delete(s);
            }
          }
        }

        prevImageSrcsRef.current = currentSrcs;
      } catch (err) {
        console.warn("Error in editor update handler", err);
      }
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  // keep editor content in sync when `value` prop changes (e.g. after fetching blog for edit)
  React.useEffect(() => {
    if (!editor) return;
    try {
      const currentHtml =
        typeof editor.getHTML === "function" ? editor.getHTML() : "";
      const incoming = value ?? "";
      if (incoming !== currentHtml) {
        // update editor content without forcing an update if identical
        isSettingContentRef.current = true;
        editor.commands.setContent(incoming);
        isSettingContentRef.current = false;
        // notify parent of the change so state stays consistent
        onChange(editor.getHTML());
      }
    } catch (err) {
      console.warn("Failed to sync editor content from prop", err);
    }
  }, [value, editor]);

  React.useEffect(() => {
    return () => {
      if (processingStateRef.current) {
        processingStateRef.current = false;
        onProcessingChange?.(false);
      }
    };
  }, [onProcessingChange]);

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async (event: any) => {
      const file: File = event.target.files[0];
      if (!file) return;

      // Insert a local preview immediately
      const tempUrl = URL.createObjectURL(file);
      editor?.chain().focus().setImage({ src: tempUrl, alt: file.name }).run();

      // start upload and keep track so we can cleanup if the user removes the temp image
      const uploadPromise = uploadImageFromEditor(file);
      pendingUploadsRef.current[tempUrl] = {
        promise: uploadPromise,
        cancelled: false,
      };
      reportProcessingState();

      uploadPromise
        .then((result) => {
          try {
            const uploadedUrl = result.url;
            const publicId = result.publicId ?? null;

            const pending = pendingUploadsRef.current[tempUrl];
            delete pendingUploadsRef.current[tempUrl];
            reportProcessingState();

            if (pending && pending.cancelled) {
              // user removed the temp image before upload finished; delete the uploaded asset
              if (publicId) {
                try {
                  const deleteKey = `del:${publicId}`;
                  const delPromise = deleteUploadedImage(publicId)
                    .catch((err) => console.warn("Failed to cleanup orphaned upload", err))
                    .finally(() => {
                      delete pendingDeletionsRef.current[deleteKey];
                      reportProcessingState();
                    });
                  pendingDeletionsRef.current[deleteKey] = delPromise;
                  reportProcessingState();
                } catch (err) {
                  console.warn("Failed to schedule deletion for orphaned upload", err);
                }
              }
              try {
                URL.revokeObjectURL(tempUrl);
              } catch (_e) {}
              return;
            }

            // replace any image nodes with the tempUrl to the uploadedUrl
            if (editor) {
              const { state, view } = editor as any;
              const tr = state.tr;
              state.doc.descendants((node: any, pos: number) => {
                if (
                  node.type.name === "image" &&
                  node.attrs &&
                  node.attrs.src === tempUrl
                ) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    src: uploadedUrl,
                  });
                }
              });
              if (tr.docChanged) view.dispatch(tr);
            }

            // map uploaded URL to its publicId for later cleanup
            if (publicId) {
              srcToPublicIdRef.current.set(uploadedUrl, publicId);
            }

            // cleanup temporary object URL
            try {
              URL.revokeObjectURL(tempUrl);
            } catch (_e) {}
          } catch (err: any) {
            toast.error(err?.message || "Image handling failed");
          }
        })
        .catch((err: any) => {
          delete pendingUploadsRef.current[tempUrl];
          reportProcessingState();
          // remove temp preview nodes inserted earlier
          if (editor) {
            const { state, view } = editor as any;
            const tr = state.tr;
            const toDelete: number[] = [];
            state.doc.descendants((node: any, pos: number) => {
              if (
                node.type.name === "image" &&
                node.attrs &&
                node.attrs.src === tempUrl
              ) {
                toDelete.push(pos);
              }
            });

            // delete from the end to maintain correct positions
            for (let i = toDelete.length - 1; i >= 0; i--) {
              const pos = toDelete[i];
              const node = state.doc.nodeAt(pos);
              if (node) {
                tr.delete(pos, pos + node.nodeSize);
              }
            }

            if (tr.docChanged) view.dispatch(tr);
          }

          try {
            URL.revokeObjectURL(tempUrl);
          } catch (_e) {}
          toast.error(err?.message || "Image upload failed");
        });
    };
    input.click();
  };

  const isTableActive = editor?.isActive("table") ?? false;
  const canInsertTable =
    editor
      ?.can()
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run() ?? false;
  const canAddRow = editor?.can().chain().focus().addRowAfter().run() ?? false;
  const canAddColumn =
    editor?.can().chain().focus().addColumnAfter().run() ?? false;
  const hasAnyTable = (() => {
    if (!editor) return false;
    let found = false;
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === "table") {
        found = true;
        return false;
      }
      return true;
    });
    return found;
  })();

  return (
    <div className="prose-container [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_em]:italic [&_.tiptap_del]:line-through [&_.tiptap_table]:my-4 [&_.tiptap_table]:w-full [&_.tiptap_table]:border-collapse [&_.tiptap_table]:border [&_.tiptap_table]:border-gray-300 [&_.tiptap_table]:table-fixed [&_.tiptap_table_th]:border [&_.tiptap_table_th]:border-gray-300 [&_.tiptap_table_th]:bg-gray-100 [&_.tiptap_table_th]:p-2 [&_.tiptap_table_th]:text-left [&_.tiptap_table_td]:border [&_.tiptap_table_td]:border-gray-300 [&_.tiptap_table_td]:p-2">
      <RichTextEditor
        editor={editor}
        className="rounded-xl overflow-hidden border"
      >
        <RichTextEditor.Toolbar
          sticky
          stickyOffset={0}
          className="flex flex-wrap gap-1 p-1"
        >
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.Highlight />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Blockquote />
            <RichTextEditor.Code />
            <RichTextEditor.CodeBlock />
            <RichTextEditor.Hr />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignRight />
            <RichTextEditor.AlignJustify />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <EditorControlButton
              label="Insert image"
              onClick={addImage}
              disabled={!editor}
            >
              <IconPhoto size={18} stroke={1.5} />
            </EditorControlButton>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <EditorControlButton
              label="Insert table"
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run();
              }}
              disabled={!canInsertTable}
              active={isTableActive}
            >
              <IconTable size={18} stroke={1.5} />
            </EditorControlButton>
            <EditorControlButton
              label="Add table row"
              onClick={() => {
                editor?.chain().focus().addRowAfter().run();
              }}
              disabled={!canAddRow}
              active={isTableActive}
            >
              <IconRowInsertBottom size={18} stroke={1.5} />
            </EditorControlButton>
            <EditorControlButton
              label="Add table column"
              onClick={() => {
                editor?.chain().focus().addColumnAfter().run();
              }}
              disabled={!canAddColumn}
              active={isTableActive}
            >
              <IconColumnInsertRight size={18} stroke={1.5} />
            </EditorControlButton>
            <EditorControlButton
              label="Delete table"
              onClick={() => {
                if (!editor) return;
                if (editor.isActive("table")) {
                  editor.chain().focus().deleteTable().run();
                } else {
                  const { state } = editor as any;
                  let tablePos: number | null = null;
                  state.doc.descendants((node: any, pos: number) => {
                    if (node.type.name === "table") {
                      tablePos = pos;
                      return false;
                    }
                    return true;
                  });
                  if (tablePos !== null) {
                    editor
                      .chain()
                      .focus()
                      .setTextSelection(tablePos + 1)
                      .deleteTable()
                      .run();
                  }
                }
              }}
              disabled={!hasAnyTable}
              active={isTableActive}
            >
              <IconTableMinus size={18} stroke={1.5} />
            </EditorControlButton>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content className="p-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[200px]" />
      </RichTextEditor>
    </div>
  );
}
