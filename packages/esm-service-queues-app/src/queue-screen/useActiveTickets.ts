import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

const activeTicketsUrl = `${restBaseUrl}/queueutil/active-tickets`;
const queueEntriesUrl = `${restBaseUrl}/queue-entry`;
const queueEntryRepresentation =
  'custom:(uuid,display,sortWeight,startedAt,status:(display),queue:(name,location:(uuid),service:(uuid)),patient:(person:(display,preferredName:(display))),visit:(attributes:(value,voided,dateCreated,attributeType:(uuid))))';

type ActiveTicket = {
  status: string;
  ticketNumber: string;
};

type QueueEntry = {
  uuid?: string;
  display?: string;
  sortWeight?: number;
  startedAt?: string;
  status?: { display?: string };
  queue?: {
    name?: string;
    location?: { uuid?: string };
    service?: { uuid?: string };
  };
  patient?: {
    person?: {
      display?: string;
      preferredName?: { display?: string };
    };
  };
  visit?: {
    attributes?: Array<{
      value?: string | number;
      voided?: boolean;
      dateCreated?: string;
      attributeType?: { uuid?: string };
    }>;
  };
};

export type QueueLineTicket = {
  id: string;
  room: string;
  ticketNumber: string;
  status: string;
  patientName: string;
  isActive: boolean;
  startedAt?: string;
  sortWeight: number;
};

export type QueueFilters = {
  locationUuid?: string | null;
  serviceUuid?: string | null;
};

const normalize = (value?: string | number) => value?.toString().trim().toLowerCase() ?? '';

const getTicketNumber = (entry: QueueEntry, attributeTypeUuid: string | null) =>
  (entry.visit?.attributes ?? [])
    .filter(
      (attribute) =>
        !attribute.voided &&
        attribute.attributeType?.uuid === attributeTypeUuid &&
        Boolean(attribute.value?.toString().trim()),
    )
    .sort((left, right) => (Date.parse(right.dateCreated ?? '') || 0) - (Date.parse(left.dateCreated ?? '') || 0))[0]
    ?.value?.toString()
    .trim() ?? '';

const fetchQueueData = async () => {
  const requestOptions = {
    cache: 'no-store' as const,
    headers: { 'Cache-Control': 'no-cache' },
  };
  const fetchQueueEntries = async () => {
    const entries: Array<QueueEntry> = [];
    let startIndex = 0;
    let page: Array<QueueEntry>;

    do {
      const queueParams = new URLSearchParams({
        v: queueEntryRepresentation,
        isEnded: 'false',
        limit: '100',
        startIndex: startIndex.toString(),
        _ts: Date.now().toString(),
      });
      const response = await openmrsFetch<{ results: Array<QueueEntry> }>(
        `${queueEntriesUrl}?${queueParams}`,
        requestOptions,
      );
      page = response.data?.results ?? [];
      entries.push(...page);
      startIndex += page.length;
    } while (page.length === 100);

    return entries;
  };
  const [activeTicketsResponse, queueEntriesResponse] = await Promise.all([
    openmrsFetch<Record<string, ActiveTicket>>(`${activeTicketsUrl}?_ts=${Date.now()}`, requestOptions),
    fetchQueueEntries(),
  ]);

  return {
    activeTickets: activeTicketsResponse.data ?? {},
    queueEntries: queueEntriesResponse,
  };
};

export const buildQueueLine = (
  activeTickets: Record<string, ActiveTicket>,
  queueEntries: Array<QueueEntry>,
  attributeTypeUuid: string | null,
  filters: QueueFilters,
): Array<QueueLineTicket> =>
  queueEntries
    .filter(
      (entry) =>
        (!filters.locationUuid || entry.queue?.location?.uuid === filters.locationUuid) &&
        (!filters.serviceUuid || entry.queue?.service?.uuid === filters.serviceUuid),
    )
    .map((entry) => {
      const ticketNumber = getTicketNumber(entry, attributeTypeUuid);
      const room = entry.queue?.name?.trim() ?? '';
      const activeTicket = Object.entries(activeTickets).find(
        ([activeRoom, ticket]) =>
          normalize(activeRoom) === normalize(room) && normalize(ticket.ticketNumber) === normalize(ticketNumber),
      )?.[1];

      return {
        id: entry.uuid ?? `${room}-${ticketNumber}`,
        room,
        ticketNumber,
        status: activeTicket?.status ?? entry.status?.display ?? '',
        patientName:
          entry.patient?.person?.preferredName?.display?.trim() ||
          entry.patient?.person?.display?.trim() ||
          entry.display?.trim() ||
          '',
        isActive: Boolean(activeTicket),
        startedAt: entry.startedAt,
        sortWeight: Number(entry.sortWeight) || 0,
      };
    })
    .filter((entry) => Boolean(entry.ticketNumber))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return (
        right.sortWeight - left.sortWeight ||
        (Date.parse(left.startedAt ?? '') || 0) - (Date.parse(right.startedAt ?? '') || 0)
      );
    });

export const useActiveTickets = (attributeTypeUuid: string | null, filters: QueueFilters = {}) => {
  const { data, isLoading, error, mutate } = useSWR(queueEntriesUrl, fetchQueueData, { refreshInterval: 3000 });
  const queueLine = buildQueueLine(data?.activeTickets ?? {}, data?.queueEntries ?? [], attributeTypeUuid, filters);

  return { queueLine, isLoading, error, mutate };
};
