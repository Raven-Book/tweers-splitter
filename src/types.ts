export interface PassageInfo {
  name: string;
  tags: string | null;
  content: string;
  line: number;
  position: string | null;
}

export interface SplitGroup {
  id: string;
  filename: string;
  passageNames: string[];
}

export interface SplitPlan {
  sourcePath: string;
  outputDir: string;
  groups: SplitGroup[];
}

export interface SplitResult {
  filesWritten: number;
  totalPassages: number;
}

export interface AppState {
  filePath: string | null;
  groups: SplitGroup[];
}
