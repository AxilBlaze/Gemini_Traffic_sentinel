export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface AudioConfig {
  sampleRate: number;
}

export type ViolationType = 
  | "helmet_missing_driver" 
  | "helmet_missing_pillion" 
  | "triple_riding" 
  | "mobile_usage_driver" 
  | "number_plate_missing"
  | "red_light_signal_break"
  | "wrong_side"
  | "signal_jump"
  | "no_seatbelt_driver"
  | "no_seatbelt_passenger";

export interface TrafficViolation {
  violation_detected: boolean;
  violation_type: ViolationType[];
  timestamp: string; // ISO format
  image_url: string; // Replaced image_base64
  vehicle_number: string;
  vehicle_type: "bike" | "scooter" | "car" | "auto" | "truck" | "unknown";
  // RTO Enrichment Fields
  owner_name: string | null;
  owner_address: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  vehicle_model: string | null;
  // Fine Calculation
  fine_breakdown: Record<string, number>;
  total_fine: number;
}
