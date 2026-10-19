export enum HomePageName {
  HOME = "Home",
}

/** Category from `GET /catalog/categories`. */
export type Category = {
  id: number
  parent_id: number | null
  name: string
  slug: string
  /** Card color from the Instagram feed palette. */
  color: "red" | "yellow" | "blue" | null
}
