import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("encerrar sessoes inativas", { minutes: 10 }, internal.sessoes.encerrarInativas, {});

export default crons;
