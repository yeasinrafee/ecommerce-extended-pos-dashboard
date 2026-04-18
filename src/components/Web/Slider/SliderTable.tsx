"use client";

import React, { useRef } from "react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Slider } from "@/hooks/web.api";
import { cn } from "@/lib/utils";

type Props = {
  sliders: Slider[];
  onEdit: (slider: Slider) => void;
  onDelete: (slider: Slider) => void;
  onOrderChange: (sliders: Slider[]) => void;
  savingOrder?: boolean;
};

const ItemType = "SLIDER_ROW";

interface SortableRowProps {
  slider: Slider;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (slider: Slider) => void;
  onDelete: (slider: Slider) => void;
  savingOrder: boolean;
}

const SortableRow = ({ slider, index, moveRow, onEdit, onDelete, savingOrder }: SortableRowProps) => {
  const ref = useRef<HTMLTableRowElement>(null);

  const [{ handlerId }, drop] = useDrop<{ id: string; index: number }, void, { handlerId: string | symbol | null }>({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => ({ id: slider.id, index }),
    canDrag: !savingOrder,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <tr
      ref={ref}
      data-handler-id={handlerId}
      className={cn(
        "border-t transition",
        isDragging ? "bg-indigo-50 opacity-80" : "hover:bg-slate-50",
      )}
    >
      <td className="px-4 py-3 align-middle">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-move"
          aria-label={`Drag slider ${slider.serial}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3 align-middle font-medium text-slate-700">{slider.serial}</td>
      <td className="px-4 py-3 align-middle">
        <img
          src={slider.image}
          alt={`Slider ${slider.serial}`}
          className="h-14 w-24 rounded-md border border-slate-200 object-cover"
        />
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {slider.link ? (
          <a
            href={slider.link}
            target="_blank"
            rel="noreferrer"
            className="max-w-[320px] truncate text-indigo-600 hover:underline"
          >
            {slider.link}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-middle text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(slider)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(slider)} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

const reindex = (items: Slider[]) => items.map((item, index) => ({ ...item, serial: index + 1 }));

const SliderTable = ({ sliders, onEdit, onDelete, onOrderChange, savingOrder = false }: Props) => {
  const moveRow = React.useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const next = [...sliders];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      onOrderChange(reindex(next));
    },
    [onOrderChange, sliders],
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="border-b px-4 py-3 text-sm text-slate-500">
        {savingOrder ? "Saving slider order..." : "Drag rows to change the slider order."}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3">Move</th>
              <th className="w-20 px-4 py-3">#</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Link</th>
              <th className="w-24 px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sliders.map((slider, index) => (
              <SortableRow
                key={slider.id}
                index={index}
                slider={slider}
                moveRow={moveRow}
                onEdit={onEdit}
                onDelete={onDelete}
                savingOrder={savingOrder}
              />
            ))}

            {sliders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No sliders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SliderTable;