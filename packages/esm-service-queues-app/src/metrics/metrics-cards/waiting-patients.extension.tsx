import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer } from '@carbon/react/icons';
import { useConfig } from '@openmrs/esm-framework';
import { MetricsCard } from './metrics-card.component';
import { useServiceMetricsCount } from '../metrics.resource';
import { useQueueEntries } from '../../hooks/useQueueEntries';
import useQueueServices from '../../hooks/useQueueService';
import { type Service } from '../metrics-container.component';
import { type Concept } from '../../types';
import { type ConfigObject } from '../../config-schema';
import { updateSelectedService, useServiceQueuesStore } from '../../store/store';

type ServiceListItem = Service | Concept;

export default function WaitingPatientsExtension() {
  const { t } = useTranslation();
  const { selectedServiceUuid, selectedServiceDisplay, selectedQueueLocationUuid } = useServiceQueuesStore();
  const { services } = useQueueServices();
  const { serviceCount } = useServiceMetricsCount(selectedServiceUuid, selectedQueueLocationUuid);
  const {
    concepts: { defaultStatusConceptUuid },
  } = useConfig<ConfigObject>();

  const defaultServiceItem: Service = { display: `${t('all', 'All')}` };
  const serviceItems: ServiceListItem[] = [defaultServiceItem, ...(services ?? [])];

  const [initialSelectedItem, setInitialSelectItem] = useState(() => {
    return !selectedServiceDisplay || !selectedServiceUuid;
  });

  const { totalCount, queueEntries } = useQueueEntries({
    service: selectedServiceUuid,
    location: selectedQueueLocationUuid,
    isEnded: false,
    status: defaultStatusConceptUuid,
  });

  const urgentCount = queueEntries.filter((entry) => entry.priority?.display?.toLowerCase() === 'urgent').length;
  const displayCount = initialSelectedItem ? (isNaN(totalCount) ? '--' : totalCount) : serviceCount;

  return (
    <MetricsCard
      icon={<Timer size={20} />}
      value={displayCount}
      label={t('waiting', 'Waiting')}
      subValue={urgentCount > 0 ? urgentCount : null}
      subLabel={t('urgent', 'Urgent')}
      subColor="red"
    />
  );
}
