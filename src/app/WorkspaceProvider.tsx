import { createContext, useCallback, useContext, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { PayrollSources, SetupValues, SourceFiles } from '../features/payroll/types';
import { loadPayrollSources } from '../features/payroll/sources';
import { errorMessage } from '../shared/format';

const initialValues: SetupValues = {
  dateRange: { start: '2026-10-01', end: '2026-10-31' },
  weeklyLeave: ['Sun'],
  holidays: [
    { date: '2026-10-10', purpose: '' },
    { date: '2026-10-12', purpose: '' },
  ],
  holidayMode: 'manual',
  officeStart: '09:30',
  officeEnd: '18:30',
  breakMinutes: 30,
};
interface Workspace {
  values: SetupValues;
  update: (patch: Partial<SetupValues>) => void;
  files: SourceFiles;
  setFile: (key: keyof SourceFiles, file: File | null) => void;
  sources: PayrollSources | null;
  busy: boolean;
  error: string;
  prepare: () => Promise<boolean>;
  invalidate: () => void;
}
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState<SourceFiles>({
    attendance: null,
    salary: null,
    holiday: null,
  });
  const [sources, setSources] = useState<PayrollSources | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const update = (patch: Partial<SetupValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setSources(null);
  };
  const setFile = (key: keyof SourceFiles, file: File | null) => {
    setFiles((current) => ({ ...current, [key]: file }));
    setSources(null);
  };
  const prepare = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      if (
        !values.dateRange.start ||
        !values.dateRange.end ||
        values.dateRange.end < values.dateRange.start
      )
        throw new Error('Choose a valid report date range.');
      if (values.officeEnd <= values.officeStart)
        throw new Error('Office end time must be later than start time.');
      if (
        !Number.isFinite(values.breakMinutes) ||
        values.breakMinutes < 0 ||
        values.breakMinutes > 240
      )
        throw new Error('Tiffin break must be between 0 and 240 minutes.');
      const minutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      if (minutes(values.officeEnd) - minutes(values.officeStart) <= values.breakMinutes)
        throw new Error('Tiffin break must be shorter than office hours.');
      if (values.holidayMode === 'file' && !files.holiday)
        throw new Error('Please select a holiday file.');
      if (
        values.holidayMode === 'manual' &&
        values.holidays.some((row) => row.purpose?.trim() && !row.date)
      )
        throw new Error('Select a date for each holiday with a purpose.');
      setSources(
        await loadPayrollSources(
          files.attendance,
          files.salary,
          values.holidayMode === 'file' ? files.holiday : null,
        ),
      );
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }, [files, values]);
  return (
    <Context.Provider
      value={{
        values,
        update,
        files,
        setFile,
        sources,
        busy,
        error,
        prepare,
        invalidate: () => setSources(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error('Workspace provider missing');
  return context;
}
