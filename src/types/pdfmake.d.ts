declare module "pdfmake/build/pdfmake" {
  type FontMap = Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
  const pdfMake: {
    addVirtualFileSystem(files: Record<string, string>): void;
    addFonts(fonts: FontMap): void;
    createPdf(definition: unknown): { download(filename?: string): unknown };
  };
  export default pdfMake;
}
