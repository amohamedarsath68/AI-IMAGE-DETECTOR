import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const ImageDropzone = ({ onFile, disabled }: ImageDropzoneProps) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files[0]) return;
      const f = files[0];
      if (!f.type.startsWith("image/")) return;
      onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all",
        "border-border hover:border-primary/60 hover:bg-primary/5",
        dragOver && "border-primary bg-primary/10 scale-[1.01]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary border border-primary/30">
            {dragOver ? (
              <ImageIcon className="h-7 w-7 text-primary" />
            ) : (
              <Upload className="h-7 w-7 text-primary" />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">
            Drop an image here or <span className="text-primary">click to browse</span>
          </p>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, WebP — analyzed locally before upload
          </p>
        </div>
      </div>
    </div>
  );
};
