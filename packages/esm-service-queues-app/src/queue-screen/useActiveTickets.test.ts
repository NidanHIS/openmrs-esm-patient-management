import { describe, expect, test } from 'vitest';
import { buildQueueLine } from './useActiveTickets';

const queueNumberAttributeUuid = 'queue-number-attribute';

const makeEntry = ({
  id,
  locationUuid,
  personDisplay = `Patient ${id}`,
  preferredName = `Patient ${id}`,
  room = `${locationUuid} room`,
  serviceUuid,
  sortWeight = 0,
  startedAt = '2026-08-09T08:00:00.000Z',
  ticketNumber,
}: {
  id: string;
  locationUuid: string;
  personDisplay?: string;
  preferredName?: string;
  room?: string;
  serviceUuid: string;
  sortWeight?: number;
  startedAt?: string;
  ticketNumber: string;
}) => ({
  uuid: id,
  display: `Patient ${id}`,
  sortWeight,
  startedAt,
  status: { display: 'Waiting' },
  queue: {
    name: room,
    location: { uuid: locationUuid },
    service: { uuid: serviceUuid },
  },
  patient: { person: { display: personDisplay, preferredName: { display: preferredName } } },
  visit: {
    attributes: [
      {
        value: ticketNumber,
        voided: false,
        dateCreated: '2026-08-09T08:00:00.000Z',
        attributeType: { uuid: queueNumberAttributeUuid },
      },
    ],
  },
});

const entries = [
  makeEntry({ id: 'opd-entry', locationUuid: 'opd-location', serviceUuid: 'opd-service', ticketNumber: 'OUT-001' }),
  // The deliberately misleading prefix proves that location mapping uses the queue UUID, not ticket text.
  makeEntry({ id: 'ipd-entry', locationUuid: 'ipd-location', serviceUuid: 'ipd-service', ticketNumber: 'OUT-999' }),
];

describe('buildQueueLine', () => {
  test('All includes patients from both OPD and IPD', () => {
    expect(buildQueueLine({}, entries, queueNumberAttributeUuid, {}).map((entry) => entry.id)).toEqual([
      'opd-entry',
      'ipd-entry',
    ]);
  });

  test.each([
    ['OPD', { locationUuid: 'opd-location' }, ['opd-entry']],
    ['IPD', { locationUuid: 'ipd-location' }, ['ipd-entry']],
    ['OPD service', { locationUuid: 'opd-location', serviceUuid: 'opd-service' }, ['opd-entry']],
    ['mismatched service', { locationUuid: 'opd-location', serviceUuid: 'ipd-service' }, []],
  ])('maps the %s filter using queue location and service UUIDs', (_label, filters, expectedIds) => {
    expect(buildQueueLine({}, entries, queueNumberAttributeUuid, filters).map((entry) => entry.id)).toEqual(
      expectedIds,
    );
  });

  test('puts the called patient first, followed by priority and then arrival time', () => {
    const queueEntries = [
      makeEntry({
        id: 'first-arrival',
        locationUuid: 'opd-location',
        serviceUuid: 'opd-service',
        ticketNumber: 'OUT-001',
        startedAt: '2026-08-09T08:00:00.000Z',
      }),
      makeEntry({
        id: 'priority-arrival',
        locationUuid: 'opd-location',
        serviceUuid: 'opd-service',
        ticketNumber: 'OUT-002',
        sortWeight: 1,
        startedAt: '2026-08-09T08:05:00.000Z',
      }),
      makeEntry({
        id: 'called-patient',
        locationUuid: 'opd-location',
        room: 'Consultation Room',
        serviceUuid: 'opd-service',
        ticketNumber: 'OUT-003',
        startedAt: '2026-08-09T08:10:00.000Z',
      }),
    ];

    const result = buildQueueLine(
      { 'Consultation Room': { status: 'calling', ticketNumber: 'OUT-003' } },
      queueEntries,
      queueNumberAttributeUuid,
      { locationUuid: 'opd-location' },
    );

    expect(result.map((entry) => entry.id)).toEqual(['called-patient', 'priority-arrival', 'first-arrival']);
    expect(result[0]).toMatchObject({ isActive: true, status: 'calling' });
  });

  test('falls back to the person display when the preferred name is blank', () => {
    const entry = makeEntry({
      id: 'name-fallback',
      locationUuid: 'opd-location',
      personDisplay: 'Dynamic Patient Name',
      preferredName: '   ',
      serviceUuid: 'opd-service',
      ticketNumber: 'OUT-004',
    });

    expect(buildQueueLine({}, [entry], queueNumberAttributeUuid, {})[0].patientName).toBe('Dynamic Patient Name');
  });
});
