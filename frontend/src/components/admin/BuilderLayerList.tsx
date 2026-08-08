"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useState } from "react";
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

function LayerRow({
  block,
  selected,
  locale,
  dragHandleProps,
  setNodeRef,
  style,
  isDragging,
  onSelect,
  onToggle,
  onDelete,
}: {
  block: HomepageBlock;
  selected: boolean;
  locale: "fa" | "en";
  dragHandleProps?: Record<string, unknown>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  onSelect?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const def = getBlockDef(block.type);
  const label = locale === "en" ? def?.labelEn : def?.labelFa;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-2 py-2.5 text-sm transition-shadow select-none",
        selected ? "border-[#003b8e] bg-[#003b8e]/8 shadow-sm" : "border-gray-200 bg-white",
        isDragging && "opacity-40",
        !block.enabled && "opacity-50",
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="touch-none p-2 -ms-1 text-gray-400 hover:text-[#003b8e] cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Drag"
        {...(dragHandleProps || {})}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="text-base pointer-events-none">{def?.icon ?? "📦"}</span>
      <span className="flex-1 truncate font-medium text-[#0a1628] pointer-events-none">
        {label ?? block.type}
      </span>
      {onToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1.5 text-gray-400 hover:text-[#003b8e]"
        >
          {block.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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

  return (
    <LayerRow
      block={block}
      selected={selected}
      locale={locale}
      setNodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
      onSelect={onSelect}
      onToggle={onToggle}
      onDelete={onDelete}
    />
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
    onReorder(next);
  };

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5 touch-pan-y">
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
      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="shadow-2xl rounded-xl ring-2 ring-[#003b8e]/40">
            <LayerRow block={activeBlock} selected locale={locale} />
          </div>
        ) : null}
      </DragOverlay>
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
