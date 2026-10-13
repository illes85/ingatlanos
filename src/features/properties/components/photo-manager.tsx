"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { addPropertyMedia, deletePropertyMedia, reorderPropertyMedia, setCoverMedia, setMediaPublic } from "../actions";

export interface ManagedPhoto {
  id: string;
  url: string;
  isCover: boolean;
  isPublic: boolean;
  caption: string | null;
}

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

async function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

function PhotoTile({
  photo,
  index,
  onCover,
  onTogglePublic,
  onRemove,
}: {
  photo: ManagedPhoto;
  index: number;
  onCover: () => void;
  onTogglePublic: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("properties.form.photos");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const iconButton = "flex size-9 cursor-pointer items-center justify-center rounded-control bg-white/95 text-ink shadow-chip hover:bg-white";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative aspect-[4/3] overflow-hidden rounded-card bg-surface-sunken", isDragging && "z-10 opacity-80 shadow-popover")}
    >
      <Image src={photo.url} alt={photo.caption ?? ""} fill sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
      {photo.isCover ? (
        <Badge overlay size="xs" className="absolute top-2.5 left-2.5 text-ink">
          {t("cover")}
        </Badge>
      ) : null}
      <button
        type="button"
        className={cn(iconButton, "absolute top-2 right-2 cursor-grab touch-none")}
        aria-label={t("move", { index: index + 1 })}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <div className="flex gap-1.5">
          {!photo.isCover ? (
            <button type="button" onClick={onCover} className={iconButton} aria-label={t("makeCover")} title={t("makeCover")}>
              <Star size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTogglePublic}
            className={iconButton}
            aria-pressed={photo.isPublic}
            aria-label={photo.isPublic ? t("public") : t("private")}
            title={photo.isPublic ? t("public") : t("private")}
          >
            {photo.isPublic ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
          </button>
        </div>
        <button type="button" onClick={onRemove} className={cn(iconButton, "text-danger-text")} aria-label={t("remove")} title={t("remove")}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/** Fotókezelő: drag & drop feltöltés a böngészőből a privát tárolóba, átrendezés húzással vagy billentyűvel. */
export function PhotoManager({ propertyId, organizationId, initialPhotos }: { propertyId: string; organizationId: string; initialPhotos: ManagedPhoto[] }) {
  const t = useTranslations("properties.form.photos");
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const refresh = () => startTransition(() => router.refresh());
  const fail = () => toast.error(t("saveFailed"));

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    const supabase = createClient();
    const uploaded: { path: string; width?: number; height?: number }[] = [];
    setProgress({ done: 0, total: files.length });
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(t("badType", { name: file.name }));
      } else if (file.size > MAX_BYTES) {
        toast.error(t("tooLarge", { name: file.name }));
      } else {
        const path = `${organizationId}/${propertyId}/${crypto.randomUUID()}.${EXTENSION[file.type]}`;
        const { error } = await supabase.storage.from("property-media").upload(path, file, { contentType: file.type });
        if (error) toast.error(t("uploadFailed", { name: file.name }));
        else uploaded.push({ path, ...(await readDimensions(file)) });
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (uploaded.length > 0) {
      const result = await addPropertyMedia(propertyId, uploaded);
      if (!result.ok) fail();
      refresh();
    }
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = photos;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    const next = arrayMove(photos, from, to).map((p, i) => ({ ...p, isCover: i === 0 }));
    setPhotos(next);
    const [reorder, cover] = await Promise.all([reorderPropertyMedia(propertyId, next.map((p) => p.id)), setCoverMedia(propertyId, next[0]!.id)]);
    if (!reorder.ok || !cover.ok) {
      setPhotos(previous);
      fail();
    }
  };

  const makeCover = async (id: string) => {
    setPhotos((list) => list.map((p) => ({ ...p, isCover: p.id === id })));
    const result = await setCoverMedia(propertyId, id);
    if (!result.ok) fail();
    refresh();
  };

  const togglePublic = async (photo: ManagedPhoto) => {
    setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, isPublic: !p.isPublic } : p)));
    const result = await setMediaPublic(propertyId, photo.id, !photo.isPublic);
    if (!result.ok) {
      setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, isPublic: photo.isPublic } : p)));
      fail();
    }
  };

  const remove = async (id: string) => {
    const previous = photos;
    setPhotos((list) => list.filter((p) => p.id !== id));
    const result = await deletePropertyMedia(propertyId, id);
    if (!result.ok) {
      setPhotos(previous);
      fail();
      return;
    }
    toast(t("removed"));
    refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[70ch] text-14 text-muted">{t("hint")}</p>

      <div
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed px-6 py-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary-soft" : "border-line-dashed bg-surface",
        )}
      >
        <ImagePlus size={28} className="text-muted" aria-hidden="true" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="cursor-pointer text-15 font-bold text-primary hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {progress ? t("uploading", progress) : dragOver ? t("dropActive") : t("drop")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void upload(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {photos.length === 0 ? (
        <p className="text-14 text-muted">{t("empty")}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {photos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onCover={() => void makeCover(photo.id)}
                  onTogglePublic={() => void togglePublic(photo)}
                  onRemove={() => void remove(photo.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
