import { db } from "../src/index.js";

const apps = [
  {
    slug: "todo",
    name: "Todo List",
    description: "A simple, powerful task manager to organize your work and life.",
    category: "Productivity",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "todos:read", description: "View your todos and lists", isRequired: true },
      { scope: "todos:write", description: "Create and update todos and lists", isRequired: true },
      { scope: "todos:delete", description: "Delete todos and lists", isRequired: false },
    ],
  },
  {
    slug: "daily-planner",
    name: "Daily Planner",
    description: "Plan your day with time blocks, priorities, and focus sessions.",
    category: "Productivity",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "planner:read", description: "View your schedule", isRequired: true },
      { scope: "planner:write", description: "Create and update time blocks", isRequired: true },
      { scope: "planner:delete", description: "Delete time blocks", isRequired: false },
    ],
  },
  {
    slug: "health-tracker",
    name: "Health Tracker",
    description: "Track workouts, water intake, sleep, and wellness streaks.",
    category: "Health",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "health:read", description: "View your health logs", isRequired: true },
      { scope: "health:write", description: "Log health data", isRequired: true },
      { scope: "health:delete", description: "Delete health logs", isRequired: false },
    ],
  },
  {
    slug: "expense-tracker",
    name: "Expense Tracker",
    description: "Log expenses, set budgets, and visualize your spending habits.",
    category: "Finance",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "expenses:read", description: "View your expenses and budgets", isRequired: true },
      { scope: "expenses:write", description: "Create and update expenses", isRequired: true },
      { scope: "expenses:delete", description: "Delete expenses", isRequired: false },
    ],
  },
  {
    slug: "notes-diary",
    name: "Notes & Diary",
    description: "A private space for journaling, quick notes, and rich-text documents.",
    category: "Notes",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "notes:read", description: "View your notes and diary", isRequired: true },
      { scope: "notes:write", description: "Create and update notes", isRequired: true },
      { scope: "notes:delete", description: "Delete notes", isRequired: false },
    ],
  },
  {
    slug: "productivity",
    name: "Productivity",
    description: "Pomodoro timer, focus tracking, and deep-work session management.",
    category: "Productivity",
    publisherId: "system",
    isSystem: true,
    isPublished: true,
    scopes: [
      { scope: "productivity:read", description: "View your focus sessions", isRequired: true },
      { scope: "productivity:write", description: "Log focus sessions", isRequired: true },
      { scope: "productivity:delete", description: "Delete sessions", isRequired: false },
    ],
  },
];

async function main() {
  for (const { scopes, ...appData } of apps) {
    const app = await db.app.upsert({
      where: { slug: appData.slug },
      create: { ...appData, scopes: { create: scopes } },
      update: { isPublished: true },
    });
    for (const scope of scopes) {
      await db.appScope.upsert({
        where: { appId_scope: { appId: app.id, scope: scope.scope } },
        create: { appId: app.id, ...scope },
        update: {},
      });
    }
    console.log(`✅  Seeded app: ${appData.name}`);
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => db.$disconnect());
