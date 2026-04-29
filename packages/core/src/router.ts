import { router } from "./trpc/index";
import { usersRouter } from "./routers/users";
import { appsRouter } from "./routers/apps";
import { todoRouter } from "./routers/todo";

export const appRouter = router({
  users: usersRouter,
  apps: appsRouter,
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
