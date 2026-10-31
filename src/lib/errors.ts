export class DomainError extends Error {
  constructor(message: string, public code: "VALIDATION" | "NOT_FOUND" = "VALIDATION") {
    super(message);
  }
}
