import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from '@carbon/react/icons';
import { MetricsCard } from './metrics-card.component';
import { useQueueEntries } from '../../hooks/useQueueEntries';
import { useServiceQueuesStore } from '../../store/store';

export default function ActivePatientsExtension() {
  const { t } = useTranslation();
  const { selectedServiceUuid, selectedQueueLocationUuid } = useServiceQueuesStore();

  const { queueEntries, isLoading } = useQueueEntries({
    service: selectedServiceUuid,
    location: selectedQueueLocationUuid,
    isEnded: false,
  });

  return (
    <MetricsCard
      icon={<Activity size={20} />}
      value={isLoading ? '--' : queueEntries.length}
      label={t('active', 'Active')}
    />
  );
}
