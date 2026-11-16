import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config.js';
import { connectDb } from './db.js';
import { startJobs } from './jobs.js';

await connectDb();
const server = createApp().listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
// Single-service hosting (staging): run the scheduled jobs here instead of a separate worker.
if (env.RUN_JOBS) startJobs();

const stop = async () => {
  server.close();
  await mongoose.disconnect();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
