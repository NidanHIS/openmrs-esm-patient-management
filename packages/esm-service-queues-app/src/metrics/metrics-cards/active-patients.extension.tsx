import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from './metrics-card.component';
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
    <MetricsCard>
      <MetricsCardHeader title={t('activePatientsTile', 'Active patients')} />
      <MetricsCardBody>
        <MetricsCardItem label={t('patients', 'Patients')} value={isLoading ? '--' : queueEntries.length} />
      </MetricsCardBody>
    </MetricsCard>
  );
}
