export type PickupUser = {
  id?: string;
  username: string;
  role?: string;
  isShared?: boolean;
};

export type PickupSchool = {
  id: string;
  name: string;
  location?: string | null;
  sports?: string[] | null;
  isActive?: boolean;
  studentCount?: number;
};

export type PickupSchoolStudent = {
  id: string;
  schoolId: string;
  studentFirstName?: string;
  studentLastName?: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentPhone?: string;
  grade?: string;
  sports?: string[] | null;
  isActive?: boolean;
};

export type PickupSchoolSignout = {
  id?: string;
  schoolId: string;
  schoolStudentId: string;
  parentGuardianName: string;
  signedOutAt?:
    | string
    | number
    | {
        seconds: number;
        nanoseconds?: number;
        type?: string;
      };
  date?: string; // YYYY-MM-DD
  signedOutBy?: string;
  notes?: string | null;
};

export type PickupStatusTotals = {
  students: number;
  signedOut: number;
};

export type PickupStatusPayload = {
  schoolId: string;
  date: string; // YYYY-MM-DD
  totals: PickupStatusTotals;
  students: PickupSchoolStudent[];
  signouts: PickupSchoolSignout[];
};
