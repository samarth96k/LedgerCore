export interface IdempotencyResult {
  key: string;
  isDuplicate: boolean;
}   