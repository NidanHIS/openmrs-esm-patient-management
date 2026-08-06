import React from 'react';
import classNames from 'classnames';
import styles from './metrics-card.scss';

interface MetricsCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  subValue?: number | string | null;
  subLabel?: string;
  subColor?: 'default' | 'red';
  children?: React.ReactNode;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ icon, value, label, subValue, subLabel, subColor }) => {
  return (
    <div className={styles.statItem}>
      <span className={styles.iconWrapper}>{icon}</span>
      <div className={styles.statContent}>
        <div className={styles.valueRow}>
          <span className={styles.mainValue}>{value}</span>
          {subValue != null && (
            <span
              className={classNames(styles.subValue, {
                [styles.red]: subColor === 'red',
              })}>
              {subValue}
            </span>
          )}
        </div>
        <div className={styles.labelRow}>
          <span className={styles.mainLabel}>{label}</span>
          {subLabel && subValue != null && <span className={styles.subLabel}>{subLabel}</span>}
        </div>
      </div>
    </div>
  );
};

// Keep legacy sub-components as no-ops so old code doesn't break at import time
export const MetricsCardHeader: React.FC<{ title: string; children?: React.ReactNode; link?: string; linkText?: string }> =
  () => null;
export const MetricsCardBody: React.FC<{ children?: React.ReactNode }> = () => null;
export const MetricsCardItem: React.FC<{
  label: string;
  value: number | string | null;
  small?: boolean;
  color?: 'default' | 'red';
}> = () => null;
