import React from 'react';
import { vi, describe, expect, test, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { useActiveTickets } from './useActiveTickets';
import { type ConfigObject } from '../config-schema';
import {
  updateSelectedQueueLocationName,
  updateSelectedQueueLocationUuid,
  updateSelectedService,
} from '../store/store';
import QueueScreen from './queue-screen.component';

const mockUseActiveTickets = vi.mocked(useActiveTickets);
const mockUseConfig = vi.mocked(useConfig<ConfigObject>);

vi.mock('./useActiveTickets', () => ({
  useActiveTickets: vi.fn(),
}));

vi.mock('../hooks/useQueues', () => ({
  useQueues: vi.fn(() => ({ queues: [], isLoading: false, error: undefined })),
}));

describe('QueueScreen component', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ visitQueueNumberAttributeUuid: 'queue-number-attribute' } as ConfigObject);
    updateSelectedQueueLocationName('Room A');
    updateSelectedQueueLocationUuid('123');
    updateSelectedService(null, 'All');
  });

  test('renders loading skeleton when data is loading', () => {
    mockUseActiveTickets.mockReturnValue({
      isLoading: true,
      queueLine: [],
      error: undefined,
      mutate: vi.fn(),
    });

    render(<QueueScreen />);

    expect(screen.getByTestId('queue-screen-skeleton')).toBeInTheDocument();
  });

  test('renders error message when there is an error fetching data', () => {
    mockUseActiveTickets.mockReturnValue({
      error: new Error('Error'),
      isLoading: false,
      queueLine: [],
      mutate: vi.fn(),
    });

    render(<QueueScreen />);

    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  test('renders empty state when there are no active tickets', () => {
    mockUseActiveTickets.mockReturnValue({
      queueLine: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<QueueScreen />);

    expect(screen.getByText('No active tickets to display')).toBeInTheDocument();
  });

  test('renders all queued patients in queue order with the currently called patient first', () => {
    mockUseActiveTickets.mockReturnValue({
      queueLine: [
        {
          id: 'entry-7',
          room: 'Outpatient Consultation',
          ticketNumber: 'OUT-007',
          status: 'serving',
          patientName: 'Test Patient',
          isActive: true,
          sortWeight: 0,
        },
        {
          id: 'entry-8',
          room: 'Outpatient Consultation',
          ticketNumber: 'OUT-008',
          status: 'Waiting',
          patientName: 'Patient Two',
          isActive: false,
          sortWeight: 0,
        },
        {
          id: 'entry-9',
          room: 'Outpatient Consultation',
          ticketNumber: 'OUT-009',
          status: 'Waiting',
          patientName: 'Patient Three',
          isActive: false,
          sortWeight: 0,
        },
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<QueueScreen />);

    const queueCards = screen.getAllByRole('listitem');

    expect(screen.getByRole('list', { name: 'Patients in queue' })).toBeInTheDocument();
    expect(queueCards).toHaveLength(3);
    expect(within(queueCards[0]).getByText('Now serving')).toBeInTheDocument();
    expect(within(queueCards[0]).getByText('OUT-007')).toBeInTheDocument();
    expect(within(queueCards[0]).getByText('Test Patient')).toBeInTheDocument();
    expect(within(queueCards[1]).getByText('Queue position 2')).toBeInTheDocument();
    expect(within(queueCards[1]).getByText('OUT-008')).toBeInTheDocument();
    expect(within(queueCards[1]).getByText('Patient Two')).toBeInTheDocument();
    expect(within(queueCards[2]).getByText('Queue position 3')).toBeInTheDocument();
    expect(within(queueCards[2]).getByText('OUT-009')).toBeInTheDocument();
    expect(within(queueCards[2]).getByText('Patient Three')).toBeInTheDocument();
    expect(mockUseActiveTickets).toHaveBeenCalledWith('queue-number-attribute', {
      locationUuid: '123',
      serviceUuid: null,
    });
  });
});
