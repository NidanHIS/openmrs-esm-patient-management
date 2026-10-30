import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownSkeleton, InlineNotification, type OnChangeData } from '@carbon/react';
import { useConfig, useSession, PageHeader, PageHeaderContent, ServiceQueuesPictogram } from '@openmrs/esm-framework';
import {
  updateSelectedQueueLocationUuid,
  updateSelectedQueueLocationName,
  updateSelectedService,
  useServiceQueuesStore,
} from '../store/store';
import { useQueues } from '../hooks/useQueues';
import type { ConfigObject } from '../config-schema';
import styles from './patient-queue-header.scss';

interface DropdownItem {
  id: string;
  name: string;
}

interface PatientQueueHeaderProps {
  title?: string | JSX.Element;
  showFilters: boolean;
  actions?: React.ReactNode;
}

const PatientQueueHeader: React.FC<PatientQueueHeaderProps> = ({ title, showFilters, actions }) => {
  const { t } = useTranslation();
  const { dashboardTitle } = useConfig<ConfigObject>();
  const userSession = useSession();
  const { selectedQueueLocationName, selectedQueueLocationUuid, selectedServiceDisplay, selectedServiceUuid } =
    useServiceQueuesStore();
  const { queues, isLoading, error } = useQueues();
  const hasInitializedDefaultLocation = useRef(false);

  const validQueueLocations = useMemo<Array<DropdownItem>>(() => {
    const locations = new Map<string, string>();

    queues.forEach((queue) => {
      if (queue.location?.uuid) {
        locations.set(queue.location.uuid, queue.location.display);
      }
    });

    return Array.from(locations, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [queues]);

  /**
   * Match user's session location with available queue locations
   */
  const sessionQueueLocation = useMemo(
    () => validQueueLocations.find((location) => location?.id === userSession?.sessionLocation?.uuid),
    [validQueueLocations, userSession?.sessionLocation?.uuid],
  );

  const showLocationDropdown = showFilters && validQueueLocations.length > 1;

  const queuesForSelectedLocation = useMemo(
    () =>
      selectedQueueLocationUuid ? queues.filter((queue) => queue.location?.uuid === selectedQueueLocationUuid) : queues,
    [queues, selectedQueueLocationUuid],
  );

  /**
   * Build unique service options
   */
  const serviceOptions = useMemo(() => {
    const services = new Map<string, string>();

    queuesForSelectedLocation.forEach((queue) => services.set(queue.service.uuid, queue.service.display));

    const options = Array.from(services, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    return options.length > 0 ? [{ id: 'all', name: t('all', 'All') }, ...options] : [];
  }, [queuesForSelectedLocation, t]);

  const showServiceDropdown = showFilters && serviceOptions.length > 1;

  /**
   * Handle queue location change
   */
  const handleQueueLocationChange = useCallback(
    ({ selectedItem }: OnChangeData<DropdownItem>) => {
      if (!selectedItem) {
        return;
      }

      if (selectedItem.id === 'all') {
        updateSelectedQueueLocationUuid(null);
        updateSelectedQueueLocationName(null);
        updateSelectedService(null, t('all', 'All'));

        return;
      }

      updateSelectedQueueLocationUuid(selectedItem.id);
      updateSelectedQueueLocationName(selectedItem.name);

      /**
       * Reset selected service when location changes
       */
      updateSelectedService(null, t('all', 'All'));
    },
    [t],
  );

  /**
   * Handle service change
   */
  const handleServiceChange = useCallback(
    (data: OnChangeData<DropdownItem>) => {
      const selectedItem = data.selectedItem;

      if (!selectedItem) {
        return;
      }

      if (selectedItem.id === 'all') {
        updateSelectedService(null, t('all', 'All'));
      } else {
        updateSelectedService(selectedItem.id, selectedItem.name);
      }
    },
    [t],
  );

  /**
   * Initialize default location once
   */
  useEffect(() => {
    if (isLoading || error || hasInitializedDefaultLocation.current) {
      return;
    }

    /**
     * Prefer session location if available
     */
    if (sessionQueueLocation) {
      if (selectedQueueLocationUuid !== sessionQueueLocation.id) {
        handleQueueLocationChange({
          selectedItem: sessionQueueLocation,
        } as OnChangeData<DropdownItem>);
      }

      hasInitializedDefaultLocation.current = true;

      return;
    }

    const selectedLocationIsValid = validQueueLocations.some((location) => location.id === selectedQueueLocationUuid);

    if (selectedQueueLocationUuid && !selectedLocationIsValid) {
      updateSelectedQueueLocationUuid(null);
      updateSelectedQueueLocationName(null);
      updateSelectedService(null, t('all', 'All'));
    }

    if (validQueueLocations.length === 1 && (!selectedQueueLocationUuid || !selectedLocationIsValid)) {
      handleQueueLocationChange({
        selectedItem: validQueueLocations[0],
      } as OnChangeData<DropdownItem>);

      hasInitializedDefaultLocation.current = true;

      return;
    }

    /**
     * Mark initialization complete once locations are loaded
     */
    if (validQueueLocations.length > 0) {
      hasInitializedDefaultLocation.current = true;
    }
  }, [
    error,
    handleQueueLocationChange,
    isLoading,
    selectedQueueLocationUuid,
    sessionQueueLocation,
    t,
    validQueueLocations,
  ]);

  /**
   * Clear a saved service that does not belong to the selected location.
   */
  useEffect(() => {
    if (
      !isLoading &&
      selectedServiceUuid &&
      !queuesForSelectedLocation.some((queue) => queue.service.uuid === selectedServiceUuid)
    ) {
      updateSelectedService(null, t('all', 'All'));
    }
  }, [isLoading, queuesForSelectedLocation, selectedServiceUuid, t]);

  return (
    <PageHeader className={styles.header} data-testid="patient-queue-header">
      <PageHeaderContent
        title={title ? title : t(dashboardTitle.key, dashboardTitle.value)}
        illustration={<ServiceQueuesPictogram />}
      />

      <div className={styles.dropdownContainer}>
        {isLoading ? (
          <div className={styles.dropdownSkeletonContainer}>
            <DropdownSkeleton />
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <InlineNotification
              kind="error"
              title={t('failedToLoadLocations', 'Failed to load locations')}
              hideCloseButton
            />
          </div>
        ) : (
          showLocationDropdown && (
            <Dropdown
              aria-label={t('selectQueueLocation', 'Select a queue location')}
              className={styles.dropdown}
              id="queueLocationDropdown"
              label={selectedQueueLocationName ?? t('all', 'All')}
              items={
                validQueueLocations.length !== 1
                  ? [
                      {
                        id: 'all',
                        name: t('all', 'All'),
                      },
                      ...validQueueLocations,
                    ]
                  : validQueueLocations
              }
              itemToString={(item) => (item ? item.name : '')}
              titleText={t('location', 'Location')}
              type="inline"
              onChange={handleQueueLocationChange}
            />
          )
        )}

        {showServiceDropdown && (
          <Dropdown
            aria-label={t('selectService', 'Select a service')}
            className={styles.dropdown}
            id="serviceDropdown"
            label={selectedServiceDisplay ?? t('all', 'All')}
            items={serviceOptions}
            itemToString={(item) => (item ? item.name : '')}
            titleText={t('service', 'Service')}
            type="inline"
            onChange={handleServiceChange}
          />
        )}

        {actions}
      </div>
    </PageHeader>
  );
};

export default PatientQueueHeader;
