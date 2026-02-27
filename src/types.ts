export interface MilkEntry {
  id?: number;
  date: string;
  quantity: number;
  rate: number;
}

export interface Payment {
  id?: number;
  date: string;
  amount: number;
}

export interface AppSettings {
  default_rate: string;
  theme?: 'midnight' | 'ocean' | 'forest' | 'light' | 'dark';
  pin?: string;
}

export interface MonthlySummary {
  totalLiters: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  totalDays: number;
}
