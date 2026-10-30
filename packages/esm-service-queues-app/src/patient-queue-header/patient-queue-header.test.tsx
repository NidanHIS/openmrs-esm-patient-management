import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultsFromConfigSchema, useConfig, useSession } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema, type ConfigObject } from '../config-schema';
import { useQueues } from '../hooks/useQueues';
import {
  updateSelectedQueueLocationName,
  updateSelectedQueueLocationUuid,
  updateSelectedService,
} from '../store/store';
import PatientQueueHeader from './patient-queue-header.component';

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockUseSession = vi.mocked(useSession);
const mockUseQueues = vi.mocked(useQueues);

vi.mock('../hooks/useQueues', () => ({
  useQueues: vi.fn(),
}));

const opdQueue = {
  uuid: 'opd-queue',
  display: 'Outpatient Consultation',
  name: 'Outpatient Consultation',
  description: '',
  location: { uuid: 'opd-location', display: 'Outpatient (OPD)' },
  service: { uuid: 'opd-service', display: 'Clinical Consult(OPD)' },
  allowedPriorities: [],
  allowedStatuses: [],
};

const ipdQueue = {
  uuid: 'ipd-queue',
  display: 'IPD Care',
  name: 'IPD Care',
  description: '',
  location: { uuid: 'ipd-location', display: 'Inpatient (IPD)' },
  service: { uuid: 'ipd-service', display: 'IPD Care' },
  allowedPriorities: [],
  allowedStatuses: [],
};

describe('PatientQueueHeader', () => {
  beforeEach(() => {
    sessionStorage.clear();
    updateSelectedQueueLocationUuid(null);
    updateSelectedQueueLocationName(null);
    updateSelectedService(null, 'All');
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    mockUseSession.mockReturnValue({ sessionLocation: null } as any);
    mockUseQueues.mockReturnValue({ queues: [], isLoading: false, error: undefined } as any);
  });

  it('defaults the location filter to the current session location when it is a queue location', async () => {
    mockUseSession.mockReturnValue({
      sessionLocation: {
        uuid: 'opd-location',
        display: 'Session Location Display',
      },
    } as any);
    mockUseQueues.mockReturnValue({ queues: [opdQueue, ipdQueue], isLoading: false, error: undefined } as any);

    render(<PatientQueueHeader showFilters />);

    await waitFor(() => {
      expect(sessionStorage.getItem('queueLocationUuid')).toBe('opd-location');
    });
    expect(sessionStorage.getItem('queueLocationName')).toBe('Outpatient (OPD)');
  });

  it('replaces a stale saved location with the current session location on initial load', async () => {
    updateSelectedQueueLocationUuid('mobile-clinic-uuid');
    updateSelectedQueueLocationName('Mobile Clinic');
    mockUseSession.mockReturnValue({
      sessionLocation: {
        uuid: 'opd-location',
        display: 'Outpatient Clinic',
      },
    } as any);
    mockUseQueues.mockReturnValue({ queues: [opdQueue, ipdQueue], isLoading: false, error: undefined } as any);

    render(<PatientQueueHeader showFilters />);

    await waitFor(() => {
      expect(sessionStorage.getItem('queueLocationUuid')).toBe('opd-location');
    });
    expect(sessionStorage.getItem('queueLocationName')).toBe('Outpatient (OPD)');
  });

  it('maps OPD, IPD, and All filters from queue definitions', async () => {
    const user = userEvent.setup();
    mockUseQueues.mockReturnValue({
      queues: [opdQueue, ipdQueue],
      isLoading: false,
      error: undefined,
    } as any);

    render(<PatientQueueHeader showFilters />);

    const locationDropdown = screen.getByRole('combobox', { name: 'Select a queue location' });
    await user.click(locationDropdown);
    expect(screen.getByRole('option', { name: 'Outpatient (OPD)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inpatient (IPD)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Inpatient (IPD)' }));
    expect(sessionStorage.getItem('queueLocationUuid')).toBe('ipd-location');

    const serviceDropdown = screen.getByRole('combobox', { name: 'Select a service' });
    await user.click(serviceDropdown);
    expect(screen.getByRole('option', { name: 'IPD Care' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Clinical Consult(OPD)' })).not.toBeInTheDocument();

    await user.click(locationDropdown);
    await user.click(screen.getByRole('option', { name: 'All' }));
    await user.click(serviceDropdown);
    expect(screen.getByRole('option', { name: 'IPD Care' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Clinical Consult(OPD)' })).toBeInTheDocument();
  });

  it('clears a saved service that belongs to a different location', async () => {
    updateSelectedQueueLocationUuid('opd-location');
    updateSelectedQueueLocationName('Outpatient (OPD)');
    updateSelectedService('ipd-service', 'IPD Care');
    mockUseQueues.mockReturnValue({
      queues: [opdQueue, ipdQueue],
      isLoading: false,
      error: undefined,
    } as any);

    render(<PatientQueueHeader showFilters />);

    await waitFor(() => expect(sessionStorage.getItem('queueServiceUuid')).toBeNull());
    expect(sessionStorage.getItem('queueServiceDisplay')).toBe('All');
  });

  it('clears a stale saved location when the session location is not a queue location', async () => {
    updateSelectedQueueLocationUuid('removed-location');
    updateSelectedQueueLocationName('Removed Location');
    updateSelectedService('removed-service', 'Removed Service');
    mockUseQueues.mockReturnValue({
      queues: [opdQueue, ipdQueue],
      isLoading: false,
      error: undefined,
    } as any);

    render(<PatientQueueHeader showFilters />);

    await waitFor(() => expect(sessionStorage.getItem('queueLocationUuid')).toBeNull());
    expect(sessionStorage.getItem('queueLocationName')).toBeNull();
    expect(sessionStorage.getItem('queueServiceUuid')).toBeNull();
    expect(sessionStorage.getItem('queueServiceDisplay')).toBe('All');
  });
});
