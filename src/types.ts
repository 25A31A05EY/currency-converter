export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  inverse_rate: number;
  result: number;
  source: string;
  timestamp: string;
  from_details: Currency;
  to_details: Currency;
  execution?: {
    durationMs: number;
    command: string;
    exitCode: number;
    engine: string;
  };
}

export interface PythonRunResponse {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
}
