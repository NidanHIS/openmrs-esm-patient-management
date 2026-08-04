import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import PatientQueueHeader from './patient-queue-header/patient-queue-header.component';
import ClinicMetrics from './metrics/metrics-container.component';
import DefaultQueueTable from './queue-table/default-queue-table.component';
import AdmittedPatientsTable from './admitted-patients/admitted-patients-table.component';
import styles from './home.scss';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.homeContainer}>
      <PatientQueueHeader showFilters />
      <ClinicMetrics />
      <Tabs defaultSelectedIndex={2}>
        <TabList className={styles.tabList} aria-label={t('patientQueueTabs', 'Patient Queue Tabs')}>
          <Tab>{t('activePatients', 'Active patients')}</Tab>
          <Tab>{t('todaysPatients', "Today's patients")}</Tab>
          <Tab>{t('myPatients', 'My patients')}</Tab>
          <Tab>{t('admittedPatients', 'Admitted patients')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className={styles.tabPanel}>
            <DefaultQueueTable filterType="active" />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <DefaultQueueTable filterType="today" />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <DefaultQueueTable filterType="my-patients" />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <AdmittedPatientsTable />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default Home;
