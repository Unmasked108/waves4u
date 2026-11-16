import { connectDb } from './db.js';
import { startJobs } from './jobs.js';

await connectDb();
startJobs();
