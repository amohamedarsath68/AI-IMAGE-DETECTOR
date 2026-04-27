import { useState } from "react";
import { Loader2, RotateCcw, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/ImageDropzone";
import { AnalysisResult, type AnalysisData } from "@/components/AnalysisResult";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Index = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisData | null>(null);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    try {
      setResult(null);
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageDataUrl: dataUrl },
      });

      if (error) {
        const msg =
          (error as any)?.context?.status === 429
            ? "Too many requests — please wait a moment and try again."
            : (error as any)?.context?.status === 402
            ? "AI credits exhausted. Add funds in workspace settings."
            : error.message || "Analysis failed.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setResult(data as AnalysisData);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

      <main className="relative mx-auto max-w-6xl px-6 py-12 sm:py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            AI Image Forensics
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Is this image <span className="text-gradient">real or AI-generated?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Upload any image and get an instant authenticity report — texture, lighting,
            anatomy and artifact analysis powered by advanced vision AI.
          </p>
        </header>

        {/* Workspace */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: image */}
          <div className="card-surface rounded-3xl border border-border p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              <ScanLine className="h-4 w-4 text-primary" />
              Source image
            </h2>

            {!preview ? (
              <ImageDropzone onFile={handleFile} disabled={loading} />
            ) : (
              <div className="space-y-4">
                <div className="scan-line relative overflow-hidden rounded-2xl border border-border bg-black">
                  <img
                    src={preview}
                    alt="Uploaded for AI analysis"
                    className="block max-h-[480px] w-full object-contain"
                  />
                  {loading && (
                    <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[1px]" />
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={reset}
                  disabled={loading}
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Analyze another image
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT: result */}
          <div className="card-surface rounded-3xl border border-border p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Authenticity report
            </h2>

            {loading ? (
              <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl pulse-dot" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary border border-primary/40">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Analyzing pixels…</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Inspecting textures, lighting, anatomy and artifacts
                  </p>
                </div>
              </div>
            ) : result ? (
              <AnalysisResult data={result} />
            ) : (
              <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary border border-border">
                  <ScanLine className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No image analyzed yet</p>
                <p className="max-w-xs text-sm text-muted-foreground/70">
                  Drop an image on the left to get probabilities, a verdict, and a plain-language explanation.
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          AI predictions are probabilistic and may be wrong. Use as guidance, not proof.
        </footer>
      </main>
    </div>
  );
};

export default Index;
