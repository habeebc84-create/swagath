// Module resolve hook: lets the project's API handlers import "hatchable"
// (a package that only exists on the Hatchable runtime) by redirecting it to
// the local shim in this directory.

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "hatchable") {
    return {
      shortCircuit: true,
      url: new URL("./hatchable.js", import.meta.url).href
    };
  }
  return nextResolve(specifier, context);
}
