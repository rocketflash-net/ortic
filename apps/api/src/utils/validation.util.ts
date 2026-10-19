import { ZodError } from "zod";

type ValidationErrorType = {
  field: string;
  message: string;
};

// Ubah error Zod menjadi daftar `{ field, message }` yang mudah ditampilkan per input di frontend.
// `prefix` dipakai saat memvalidasi bagian dari payload, mis. `info` atau `blocks.2.data`.
const formatZodIssues = (error: ZodError, prefix?: string): ValidationErrorType[] =>
  error.issues.map((issue) => ({
    field: [prefix, ...issue.path.map(String)].filter(Boolean).join("."),
    message: issue.message,
  }));

export { formatZodIssues, type ValidationErrorType };
