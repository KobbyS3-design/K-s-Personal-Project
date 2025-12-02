

declare global {
  interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  }
}

export type ViewState = 'DASHBOARD' | 'PATIENTS' | 'PATIENT_DETAIL' | 'SETTINGS';

export interface Patient {
  id: string;
  name: string;
  roomNumber?: string;
}

export enum FrequencyType {
  STAT = 'STAT', // Immediate one-time dose
  BD = 'BD',   // Twice a day (12h)
  TID = 'TID', // Three times a day (8h)
  QID = 'QID', // Four times a day (6h)
  DAILY = 'DAILY', // Once a day (24h)
  PRN = 'PRN', // As needed
  CUSTOM = 'CUSTOM'
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  form?: string; // e.g. Tablet, Capsule, Syrup
  route: string; // PO, IV, etc.
  frequency: FrequencyType;
  intervalHours: number; // 0 for PRN
  lastServedAt: number | null; // Timestamp
  nextDueAt: number | null; // Timestamp
  notes?: string; // Optional clinical notes/instructions
  isCompleted?: boolean; // If true, course is finished/discontinued
}

export type LogStatus = 'SERVED' | 'MISSED';

export interface MedicationLog {
  id: string;
  medicationId: string;
  servedAt: number; // The timestamp of the event (whether served or missed)
  status: LogStatus;
  notes?: string;
}

// Helper to convert Frequency Enum to hours
export const FREQUENCY_HOURS: Record<FrequencyType, number> = {
  [FrequencyType.STAT]: 0,
  [FrequencyType.BD]: 12,
  [FrequencyType.TID]: 8,
  [FrequencyType.QID]: 6,
  [FrequencyType.DAILY]: 24,
  [FrequencyType.PRN]: 0,
  [FrequencyType.CUSTOM]: 0, // Handled dynamically
};