export const SNMP_STANDARD = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  ifNumber: '1.3.6.1.2.1.2.1.0',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifInErrors: '1.3.6.1.2.1.2.2.1.14',
  ifOutErrors: '1.3.6.1.2.1.2.2.1.20',
} as const;

export const MIKROTIK_SNMP = {
  cpuLoad: '1.3.6.1.4.1.14988.1.1.4.4.0',
  memoryUsage: '1.3.6.1.4.1.14988.1.1.4.4.2.0',
  totalMemory: '1.3.6.1.4.1.14988.1.1.4.4.1.0',
} as const;

export const VSOL_SNMP = {
  enterpriseBase: '1.3.6.1.4.1.37950',
  onuOpticalTable: '1.3.6.1.4.1.37950.1.1.5.12.2.1.8.1.7',
} as const;

export const CDATA_SNMP = {
  enterpriseBase: '1.3.6.1.4.1.34592',
  gponOnuConfigTable: '1.3.6.1.4.1.34592.1.5.1.1.2.18.1.1',
  gponOnuSn: 4,
  gponOnuOpticalTable: '1.3.6.1.4.1.34592.1.5.1.1.2.18.6.1',
  gponOnuOpticalRxPower: 4,
  gponOnuOpticalTxPower: 2,
  eponOnuTable: '1.3.6.1.4.1.34592.1.3.4.1.1',
  eponOnuId: 1,
  eponOnuSerial: 3,
  eponOnuRxPower: 36,
  eponOnuTxPower: 37,
  eponOnuRange: 15,
  eponOnuOnlineStatus: 11,
} as const;

export const UBIQUITI_SNMP = {
  cpuUsage: '1.3.6.1.4.1.41112.1.6.1.1.0',
  memoryUsage: '1.3.6.1.4.1.41112.1.6.1.2.0',
} as const;
