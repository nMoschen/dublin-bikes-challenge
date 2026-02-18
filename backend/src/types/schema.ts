export enum FieldType {
  BOOLEAN = "BOOLEAN",
  DATE = "DATE",
  FLOAT = "FLOAT",
  INTEGER = "INTEGER",
  OPTION = "OPTION",
  TEXT = "TEXT",
}

export interface Field {
  display: string;
  name: string;
  options: string[];
  type: FieldType;
}

export type RawRow = Record<string, unknown>;
