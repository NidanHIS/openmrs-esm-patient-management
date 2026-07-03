import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { MetricsCard, MetricsCardHeader, MetricsCardBody, MetricsCardItem } from './metrics-card.component';
import { useQueueEntries } from '../../hooks/useQueueEntries';
import { useServiceQueuesStore } from '../../store/store';

dayjs.extend(isToday);

export default function TodaysPatientsExtension() {
  const { t } = useTranslation();
  const { selectedServiceUuid, selectedQueueLocationUuid } = useServiceQueuesStore();

  const { queueEntries, isLoading } = useQueueEntries({
    service: selectedServiceUuid,
    location: selectedQueueLocationUuid,
    isEnded: false,
  });

  const todaysPatientsCount = queueEntries.filter(
    (entry) => entry.startedAt && dayjs(entry.startedAt).isToday(),
  ).length;

  return (
    <MetricsCard>
      <MetricsCardHeader title={t('todaysPatientsTile', "Today's patients")} />
      <MetricsCardBody>
        <MetricsCardItem label={t('patients', 'Patients')} value={isLoading ? '--' : todaysPatientsCount} />
      </MetricsCardBody>
    </MetricsCard>
  );
}
