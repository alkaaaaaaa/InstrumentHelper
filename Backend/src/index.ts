import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { connectDB } from "./db"
import { scoreRoutes } from "./routes/score"

await connectDB()

const app = new Elysia()
  .use(cors())
  .use(scoreRoutes)
  .get("/", () => "Hello Elysia")
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
