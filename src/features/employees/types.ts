export interface ManagedEmployee {
  id: string;
  name: string;
  email: string;
  monthlySalary: number | null;
  archived: boolean;
  version: number;
}
