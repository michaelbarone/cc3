declare module "archiver";
declare module "extract-zip" {
  export interface Entry {
    fileName: string;
    compressedSize: number;
    uncompressedSize: number;
    type: string;
    lastModified: Date;
  }

  export interface ExtractOptions {
    dir: string;
    onEntry?: (entry: Entry) => void;
  }

  export default function extract(source: string, options: ExtractOptions): Promise<void>;
}
