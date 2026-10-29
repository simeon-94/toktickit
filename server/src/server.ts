import "dotenv/config";
import app from "./app";
import { validateEnv } from "./config";

const envErrors = validateEnv(process.env);
if (envErrors.length > 0) {
  console.error(`Invalid configuration:\n- ${envErrors.join("\n- ")}`);
  process.exit(1);
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`TokTickIT API listening on http://localhost:${PORT}`);
});
