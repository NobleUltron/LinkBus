/** Stand-in for the axios 401 response interceptor. */
type Handler = () => void;

let handler: Handler | null = null;

export function registerUnauthorizedHandler(next: Handler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function handleUnauthorized(): void {
  handler?.();
}