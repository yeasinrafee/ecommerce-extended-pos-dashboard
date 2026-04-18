export type BlogItem = {
  id: string
  title: string
  author: string
  category: string
  tags: string[]
  createdAt: string
  shortDescription?: string
  content?: string
  image?: string
}

export const SAMPLE_BLOGS: BlogItem[] = [
  {
    id: "1",
    title: "Introducing Our New Feature",
    author: "Jane Doe",
    category: "Release",
    tags: ["Product", "Release"],
    createdAt: new Date().toISOString(),
    shortDescription: "Announcing our latest feature.",
    content: "",
    image: "",
  },
  {
    id: "2",
    title: "How to Optimize Performance",
    author: "John Smith",
    category: "Tutorial",
    tags: ["Performance", "Node"],
    createdAt: new Date().toISOString(),
    shortDescription: "Performance tuning tips for Node apps.",
    content: "",
    image: "",
  },
]

export function getBlogById(id: string): BlogItem | undefined {
  return SAMPLE_BLOGS.find((b) => b.id === id)
}
