import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@openmrs/esm-framework';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from './metrics-card.component';
import { useQueueEntries } from '../../hooks/useQueueEntries';
import { useServiceQueuesStore } from '../../store/store';

export default function MyPatientsExtension() {
  const { t } = useTranslation();
  const session = useSession();
  const currentProviderUuid = session?.currentProvider?.uuid;
  const { selectedServiceUuid, selectedQueueLocationUuid } = useServiceQueuesStore();

  const { queueEntries, isLoading } = useQueueEntries({
    service: selectedServiceUuid,
    location: selectedQueueLocationUuid,
    isEnded: false,
    providerWaitingFor: currentProviderUuid || '00000000-0000-0000-0000-000000000000',
  });

  const myPatientsCount = queueEntries.length;

  return (
    <MetricsCard>
      <MetricsCardHeader title={t('myPatientsTile', 'My patients')} />
      <MetricsCardBody>
        <MetricsCardItem label={t('patients', 'Patients')} value={isLoading ? '--' : myPatientsCount} />
      </MetricsCardBody>
    </MetricsCard>
  );
}
