"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react";
import type { HomepageBlock } from "@/lib/cms-client";
import { BLOCK_REGISTRY, getBlockDef } from "@/lib/block-registry";

type Props = {
  blocks: HomepageBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (blocks: HomepageBlock[]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  locale: "fa" | "en";
};

function SortableLayer({
  block,
  selected,
  onSelect,
  onToggle,
  onDelete,
  locale,
}: {
  block: HomepageBlock;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  locale: "fa" | "en";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const def = getBlockDef(block.type);
  const label = locale === "en" ? def?.labelEn : def?.labelFa;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-2 py-2 text-sm transition-all cursor-pointer",
        selected ? "border-[#003b8e] bg-[#003b8e]/8 shadow-sm" : "border-gray-200 bg-white hover:border-[#003b8e]/30",
        isDragging && "opacity-60 shadow-lg z-50",
        !block.enabled && "opacity-50",
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="touch-none p-1 text-gray-400 hover:text-[#003b8e] cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-base">{def?.icon ?? "📦"}</span>
      <span className="flex-1 truncate font-medium text-[#0a1628]">{label ?? block.type}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="p-1 text-gray-400 hover:text-[#003b8e]"
      >
        {block.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 text-gray-400 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function BuilderLayerList({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onToggle,
  onDelete,
  locale,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next.map((b, i) => ({ ...b, order: i })));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {blocks.map((block) => (
            <SortableLayer
              key={block.id}
              block={block}
              selected={selectedId === block.id}
              onSelect={() => onSelect(block.id)}
              onToggle={() => onToggle(block.id)}
              onDelete={() => onDelete(block.id)}
              locale={locale}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function BlockPalette({
  onAdd,
  locale,
}: {
  onAdd: (type: string) => void;
  locale: "fa" | "en";
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {BLOCK_REGISTRY.map((def) => (
        <button
          key={def.type}
          type="button"
          onClick={() => onAdd(def.type)}
          className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-[#003b8e]/25 bg-[#003b8e]/4 px-2 py-2.5 text-xs font-medium text-[#003b8e] hover:bg-[#003b8e]/10 hover:border-[#003b8e]/50 transition-colors"
        >
          <span className="text-lg">{def.icon}</span>
          <span className="truncate w-full text-center">{locale === "en" ? def.labelEn : def.labelFa}</span>
        </button>
      ))}
    </div>
  );
}
