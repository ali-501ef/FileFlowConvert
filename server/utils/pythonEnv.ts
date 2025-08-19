import path from "path";

export function withPythonEnv(env: NodeJS.ProcessEnv = process.env) {
  const pydeps = path.join(process.cwd(), "server", ".pydeps");
  return {
    ...env,
    PYTHONPATH: `${pydeps}:${env.PYTHONPATH ?? ""}`,
  };
}