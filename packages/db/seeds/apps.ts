import { db } from "../src/index.js";

const apps = [
  {
    slug: "todo",
    name: "Todo List",
    description:
      "A simple, powerful task manager to organize your work and life.",
    category: "Productivity",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      {
        scope: "todos:read",
        description: "View your todos and lists",
        isRequired: true,
      },
      {
        scope: "todos:write",
        description: "Create and update todos and lists",
        isRequired: true,
      },
      {
        scope: "todos:delete",
        description: "Delete todos and lists",
        isRequired: false,
      },
    ],
  },
];

async function main() {
  for (const { scopes, ...appData } of apps) {
    await db.app.upsert({
      where: { slug: appData.slug },
      create: {
        ...appData,
        scopes: { create: scopes },
      },
      update: { isPublished: true },
    });
    console.log(`✅  Seeded app: ${appData.name}`);
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => db.$disconnect());
