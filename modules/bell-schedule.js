import { Temporal } from '@js-temporal/polyfill';
if (!globalThis.Temporal) globalThis.Temporal = Temporal;
import { BellSchedule } from '@peterseibel/bells';
import cal2223 from '@peterseibel/bhs-calendars/2022-2023' with { type: 'json' };
import cal2324 from '@peterseibel/bhs-calendars/2023-2024' with { type: 'json' };
import cal2425 from '@peterseibel/bhs-calendars/2024-2025' with { type: 'json' };
import cal2526 from '@peterseibel/bhs-calendars/2025-2026' with { type: 'json' };

export const bellSchedule = new BellSchedule([cal2223, cal2324, cal2425, cal2526]);
