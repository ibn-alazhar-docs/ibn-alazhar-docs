export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason, _promise) => {
      console.error("[UNHANDLED_REJECTION]", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("[UNCAUGHT_EXCEPTION]", error);
    });
  }
}
