import { router } from "./trpc/index";
import { usersRouter } from "./routers/users";
import { appsRouter } from "./routers/apps";
import { todoRouter } from "./routers/todo";
import { notificationsRouter } from "./routers/notifications";
import { dailyPlannerRouter } from "./routers/daily-planner";
import { healthRouter } from "./routers/health";
import { expenseRouter } from "./routers/expense";
import { notesRouter } from "./routers/notes";
import { pomodoroRouter } from "./routers/pomodoro";
import { rolesRouter } from "./routers/roles";

export const appRouter = router({
  users: usersRouter,
  apps: appsRouter,
  todo: todoRouter,
  notifications: notificationsRouter,
  dailyPlanner: dailyPlannerRouter,
  health: healthRouter,
  expense: expenseRouter,
  notes: notesRouter,
  pomodoro: pomodoroRouter,
  roles: rolesRouter,
});

export type AppRouter = typeof appRouter;
