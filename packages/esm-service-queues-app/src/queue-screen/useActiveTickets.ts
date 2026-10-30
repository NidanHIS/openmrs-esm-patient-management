import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

const activeTicketsUrl = `${restBaseUrl}/queueutil/active-tickets`;
const queueEntriesUrl = `${restBaseUrl}/queue-entry`;
const queueEntryRepresentation =
  'custom:(uuid,sortWeight,startedAt,status:(display),queue:(uuid,name,location:(uuid),service:(uuid)),visit:(attributes:(value,voided,dateCreated,attributeType:(uuid))))';

type ActiveTicket = {
  status?: string;
  ticketNumber?: string;
  queueEntryUuid?: string;
  queueUuid?: string;
  locationUuid?: string;
  serviceUuid?: string;
};

type QueueEntry = {
  uuid?: string;
  sortWeight?: number;
  startedAt?: string;
  status?: { display?: string };
  queue?: {
    uuid?: string;
    name?: string;
    location?: { uuid?: string };
    service?: { uuid?: string };
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
  isActive: boolean;
  startedAt?: string;
  sortWeight: number;
};

export type QueueFilters = {
  locationUuid?: string | null;
  serviceUuid?: string | null;
};

const normalize = (value?: string | number) => value?.toString().trim().toLowerCase() ?? '';

const getTicketNumber = (entry: QueueEntry, attributeTypeUuid: string | null) => {
  const normalizedAttributeTypeUuid = normalize(attributeTypeUuid ?? undefined);
  if (!normalizedAttributeTypeUuid) {
    return '';
  }

  return (
    (entry.visit?.attributes ?? [])
      .filter(
        (attribute) =>
          !attribute.voided &&
          normalize(attribute.attributeType?.uuid) === normalizedAttributeTypeUuid &&
          Boolean(attribute.value?.toString().trim()),
      )
      .sort((left, right) => (Date.parse(right.dateCreated ?? '') || 0) - (Date.parse(left.dateCreated ?? '') || 0))[0]
      ?.value?.toString()
      .trim() ?? ''
  );
};

const matchesActiveTicket = (
  activeKey: string,
  activeTicket: ActiveTicket,
  entry: QueueEntry,
  ticketNumber: string,
) => {
  if (!normalize(ticketNumber) || normalize(activeTicket.ticketNumber) !== normalize(ticketNumber)) {
    return false;
  }

  const identifiers = [
    [activeTicket.queueEntryUuid, entry.uuid],
    [activeTicket.queueUuid, entry.queue?.uuid],
    [activeTicket.locationUuid, entry.queue?.location?.uuid],
    [activeTicket.serviceUuid, entry.queue?.service?.uuid],
  ].filter(([activeIdentifier]) => Boolean(normalize(activeIdentifier)));

  if (identifiers.length) {
    return identifiers.every(
      ([activeIdentifier, entryIdentifier]) => normalize(activeIdentifier) === normalize(entryIdentifier),
    );
  }

  return normalize(activeKey) === normalize(entry.queue?.uuid) || normalize(activeKey) === normalize(entry.queue?.name);
};

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
    openmrsFetch<Record<string, ActiveTicket>>(`${activeTicketsUrl}?_ts=${Date.now()}`, requestOptions).catch(
      () => null,
    ),
    fetchQueueEntries(),
  ]);
  const activeTickets = activeTicketsResponse?.data;

  return {
    activeTickets: activeTickets && !Array.isArray(activeTickets) ? activeTickets : {},
    queueEntries: queueEntriesResponse,
  };
};

export const buildQueueLine = (
  activeTickets: Record<string, ActiveTicket>,
  queueEntries: Array<QueueEntry>,
  attributeTypeUuid: string | null,
  filters: QueueFilters,
): Array<QueueLineTicket> => {
  const activeTicketEntries = Object.entries(activeTickets);
  const consumedActiveTickets = new Set<number>();

  return queueEntries
    .filter(
      (entry) =>
        (!filters.locationUuid || entry.queue?.location?.uuid === filters.locationUuid) &&
        (!filters.serviceUuid || entry.queue?.service?.uuid === filters.serviceUuid),
    )
    .map((entry) => {
      const ticketNumber = getTicketNumber(entry, attributeTypeUuid);
      const room = entry.queue?.name?.trim() ?? '';
      const activeTicketIndex = activeTicketEntries.findIndex(
        ([activeKey, activeTicket], index) =>
          !consumedActiveTickets.has(index) && matchesActiveTicket(activeKey, activeTicket, entry, ticketNumber),
      );
      const activeTicket = activeTicketIndex >= 0 ? activeTicketEntries[activeTicketIndex][1] : undefined;
      if (activeTicketIndex >= 0) {
        consumedActiveTickets.add(activeTicketIndex);
      }

      return {
        id: entry.uuid ?? `${room}-${ticketNumber}`,
        room,
        ticketNumber,
        status: activeTicket?.status ?? entry.status?.display ?? '',
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
};

export const useActiveTickets = (attributeTypeUuid: string | null, filters: QueueFilters = {}) => {
  const { data, isLoading, error, mutate } = useSWR(queueEntriesUrl, fetchQueueData, { refreshInterval: 3000 });
  const queueLine = buildQueueLine(data?.activeTickets ?? {}, data?.queueEntries ?? [], attributeTypeUuid, filters);

  return { queueLine, isLoading, error, mutate };
};
