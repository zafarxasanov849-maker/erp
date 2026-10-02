import { createLoader, createParser } from "nuqs/server";

import { reportSearchParams } from "@/features/reports/search-params";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parseAsUuid = createParser({
  parse: (v) => (UUID.test(v) ? v : null),
  serialize: (v: string) => v,
});

/** Tushumlar ro'yxati: davr (hisobotlar bilan bir xil) + to'lov turi + qabul qilgan xodim */
export const paymentsSearchParams = {
  ...reportSearchParams,
  method: parseAsUuid,
  staff: parseAsUuid,
};

export const loadPaymentsSearchParams = createLoader(paymentsSearchParams);
