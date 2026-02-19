import { fetchApi } from "./api.service";

export type Item = Record<string, ItemValue>;

export type ItemValue = boolean | Date | null | number | string;

export async function getData() {
  return fetchApi<Item[]>({
    endpoint: "data",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  });
}
