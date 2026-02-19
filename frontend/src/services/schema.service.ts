import { fetchApi } from "./api.service";

export enum SchemaType {
  Boolean = "BOOLEAN",
  Date = "DATE",
  Float = "FLOAT",
  Integer = "INTEGER",
  Option = "OPTION",
  Text = "TEXT",
}

export interface Schema {
  display: string;
  name: string;
  options: string[];
  type: SchemaType;
}

export async function getSchema() {
  return fetchApi<Schema[]>({ endpoint: "schema" });
}
