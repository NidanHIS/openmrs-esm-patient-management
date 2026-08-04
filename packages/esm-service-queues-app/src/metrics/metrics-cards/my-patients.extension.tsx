import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '@carbon/react/icons';
import { useSession } from '@openmrs/esm-framework';
import { MetricsCard } from './metrics-card.component';
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

  return (
    <MetricsCard
      icon={<User size={20} />}
      value={isLoading ? '--' : queueEntries.length}
      label={t('myPatients', 'My Patients')}
    />
  );
}
