import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownSkeleton, InlineNotification, type OnChangeData } from '@carbon/react';
import { useConfig, useSession, PageHeader, PageHeaderContent, ServiceQueuesPictogram } from '@openmrs/esm-framework';
import { useQueueLocations } from '../create-queue-entry/hooks/useQueueLocations';
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
  const { queueLocations, isLoading, error } = useQueueLocations();
  const { dashboardTitle } = useConfig<ConfigObject>();
  const userSession = useSession();
  const { selectedQueueLocationName, selectedQueueLocationUuid, selectedServiceDisplay } = useServiceQueuesStore();
  const { queues } = useQueues();
  const hasInitializedDefaultLocation = useRef(false);

  /**
   * Remove invalid/null/undefined locations once
   */
  const validQueueLocations = useMemo(() => queueLocations.filter(Boolean), [queueLocations]);

  /**
   * Match user's session location with available queue locations
   */
  const sessionQueueLocation = useMemo(
    () => validQueueLocations.find((location) => location?.id === userSession?.sessionLocation?.uuid),
    [validQueueLocations, userSession?.sessionLocation?.uuid],
  );

  const showLocationDropdown = showFilters && validQueueLocations.length > 1;

  const showServiceDropdown = showFilters && queues.length > 1;

  /**
   * Build unique service options
   */
  const serviceOptions = useMemo(() => {
    const options = queues
      .map((queue) => ({
        id: queue.service.uuid,
        name: queue.service.display,
      }))
      .reduce<Array<DropdownItem>>((acc, curr) => {
        if (!acc.some((option) => option.id === curr.id)) {
          acc.push(curr);
        }

        return acc;
      }, []);

    return options.length !== 1 ? [{ id: 'all', name: t('all', 'All') }, ...options] : options;
  }, [queues, t]);

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

    /**
     * Auto-select if only one location exists
     */
    if (!selectedQueueLocationUuid && validQueueLocations.length === 1) {
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
    validQueueLocations,
  ]);

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
