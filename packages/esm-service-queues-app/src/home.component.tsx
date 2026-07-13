import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import PatientQueueHeader from './patient-queue-header/patient-queue-header.component';
import ClinicMetrics from './metrics/metrics-container.component';
import DefaultQueueTable from './queue-table/default-queue-table.component';
import styles from './queue-table/queue-table.scss';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <PatientQueueHeader showFilters />
      <ClinicMetrics />
      <Tabs defaultSelectedIndex={2}>
        <TabList className={styles.tabList} aria-label={t('patientQueueTabs', 'Patient Queue Tabs')} contained>
          <Tab>{t('activePatient', 'Active patient')}</Tab>
          <Tab>{t('todaysPatient', "Today's patient")}</Tab>
          <Tab>{t('myPatient', 'My Patient')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DefaultQueueTable filterType="active" />
          </TabPanel>
          <TabPanel>
            <DefaultQueueTable filterType="today" />
          </TabPanel>
          <TabPanel>
            <DefaultQueueTable filterType="my-patients" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};

export default Home;
