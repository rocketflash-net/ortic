import { AsyncLocalStorage } from "async_hooks";

type RequestContextType = {
  requestId: string;
};

// Konteks per request (request id) yang ikut terbawa ke seluruh kode async di dalam request tersebut,
// sehingga log dari service/repository otomatis membawa requestId tanpa meneruskan `req`.
const requestContext = new AsyncLocalStorage<RequestContextType>();

const currentRequestId = (): string | undefined => requestContext.getStore()?.requestId;

export { requestContext, currentRequestId, type RequestContextType };
