import { createWriteStream } from "node:fs";
import path from "node:path";
import { ZipArchive, type ArchiverError } from "archiver";

export function writeModpackZip(
  sourcePath: string,
  archivePath: string,
  manifest: Record<string, unknown>
) {
  return new Promise<void>((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error: ArchiverError) => {
      if (error.code === "ENOENT") return;
      reject(error);
    });
    archive.on("error", reject);

    archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), {
      name: "every-helper-modpack.json"
    });
    archive.directory(sourcePath, path.basename(sourcePath));
    archive.finalize().catch(reject);
  });
}

export function safeArchiveStem(value: string) {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "every-helper-modpack"
  );
}
