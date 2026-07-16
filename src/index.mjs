import dotenv from "dotenv";
import { startCLI } from "./agent/loop.mjs";

dotenv.config();

const args = process.argv.slice(2);
const verbose = args.includes("-v") || args.includes("--verbose");

startCLI({ verbose });
