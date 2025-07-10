/**
 * Minimal Result pattern for @synet/credential
 *
 * API-compatible with @synet/patterns Result but self-contained.
 * Removes unused methods (map, flatMap, recover, ensure, combine).
 */

/**
 * A simple and versatile Result pattern implementation
 * Used for representing the outcome of operations that might fail
 */
export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: {
      message: string;
      cause?: Error;
      data?: unknown[];
    },
  ) {}

  /**
   * Returns whether this Result represents a successful operation
   */
  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  /**
   * Returns whether this Result represents a failed operation
   */
  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  /**
   * Returns the success value
   * @throws Error if called on a failed result
   */
  public get value(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot get value from a failed result");
    }
    return this._value as T;
  }

  /**
   * Returns the error details if this is a failure result
   */
  public get error():
    | { message: string; cause?: Error; data?: unknown[] }
    | undefined {
    return this._error;
  }

  /**
   * Returns the error message if this is a failure result
   */
  public get errorMessage(): string | undefined {
    return this._error?.message;
  }

  /**
   * Returns the error cause if this is a failure result
   */
  public get errorCause(): Error | undefined {
    return this._error?.cause;
  }

  /**
   * Creates a successful result with a value
   * @param value The success value
   */
  public static success<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  /**
   * Creates a failure result with a message, optional cause, and optional context data
   * @param message Error message describing what went wrong
   * @param cause Optional underlying error that caused the failure
   * @param data Optional additional context data for debugging
   */
  public static fail<T>(
    message: string,
    cause?: Error,
    ...data: unknown[]
  ): Result<T> {
    return new Result<T>(false, undefined, {
      message,
      cause,
      data: data.length > 0 ? data : undefined,
    });
  }

  /**
   * Executes the given callback if this is a success result
   * @param fn Function to execute with the success value
   * @returns This result, for method chaining
   */
  public onSuccess(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this.value);
    }
    return this;
  }

  /**
   * Executes the given callback if this is a failure result
   * @param fn Function to execute with the error details
   * @returns This result, for method chaining
   */
  public onFailure(
    fn: (message: string, cause?: Error, data?: unknown[]) => void,
  ): Result<T> {
    if (this.isFailure && this._error) {
      fn(this._error.message, this._error.cause, this._error.data);
    }
    return this;
  }

  /**
   * Checks if the result is null
   * @returns true if the result is null, false otherwise
   */
  public isNull(): boolean {
    return this.isSuccess && this.value === null;
  }
}

/**
 * Credential-specific result types
 */
export interface VerificationResult {
  verified: boolean;
  issuer?: string;
  subject?: string;
  issuanceDate?: string;
  expirationDate?: string;
}
