export type TenantKind = "Platform" | "College" | "TrainingProvider" | "Corporate";

export interface Me {
  id: string;
  email: string;
  fullName: string;
  headline?: string;
  interests: string[];
  isPlatformStaff: boolean;
  tenants: { id: string; name: string; kind: TenantKind; roles: string[]; permissions: string[] }[];
}

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  level: string;
  priceMinor: number;
  currency: string;
  instructor: string;
  provider: string;
  providerKind: TenantKind;
  providerVerified: boolean;
  lessons: number;
  minutes: number;
  learners: number;
}

export interface Balance {
  pending: number;
  approved: number;
  payable: number;
  paid: number;
  onHold: number;
  currency: string;
}

export interface CommissionEntry {
  id: string;
  orderId: string;
  recipientKind: "Professor" | "College" | "Referrer" | "Platform";
  entryType: "Accrual" | "Reversal";
  baseMinor: number;
  rateBp: number;
  amountMinor: number;
  currency: string;
  planVersion: number;
  status: string;
  releaseStage?: "Purchase" | "FirstMilestone" | "HalfwayMilestones" | "CourseCompleted" | null;
  releasedAt?: string | null;
  availableAt: string;
  createdAt: string;
  calculation: string;
  payoutId?: string;
  course?: string;
  recipient?: string;
  plan?: string;
}

export interface Payout {
  id: string;
  recipientKind: string;
  amountMinor: number;
  currency: string;
  status: "Requested" | "Approved" | "Paid" | "Rejected";
  createdAt: string;
  paidAt?: string;
  reference?: string;
  recipient?: string;
  entries: number;
}

export interface Eligibility {
  lessonsCompleted: number;
  lessonsTotal: number;
  assessmentsPassed: number;
  assessmentsTotal: number;
  sessionsAttended: number;
  sessionsRequired: number;
  vivaRequired?: boolean;
  vivaPassed?: boolean;
  bestScorePercent?: number;
  eligible: boolean;
}
