import { toast } from "sonner";

const DEFAULT_MESSAGES = {
  success: "تمت العملية بنجاح",
  error: "حدث خطأ، يرجى المحاولة مرة أخرى",
  loading: "جاري المعالجة...",
};

export function showToast(options?: { success?: string; error?: string; loading?: string }) {
  return {
    success: (message?: string) =>
      toast.success(message || options?.success || DEFAULT_MESSAGES.success),
    error: (message?: string) => toast.error(message || options?.error || DEFAULT_MESSAGES.error),
    loading: (message?: string) =>
      toast.loading(message || options?.loading || DEFAULT_MESSAGES.loading),
    promise: <T>(promise: Promise<T>, opts: { success?: string; error?: string }) =>
      toast.promise(promise, {
        success: opts.success || DEFAULT_MESSAGES.success,
        error: opts.error || DEFAULT_MESSAGES.error,
      }),
  };
}

export { toast } from "sonner";
