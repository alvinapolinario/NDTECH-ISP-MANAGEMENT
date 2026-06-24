export const COLLECTOR_SYNC_PACKAGE_VERSION = 1;

export enum CollectorSyncEventType {
  payment = 'payment',
  collection_update = 'collection_update',
  visit_note = 'visit_note',
}

export enum CollectorVisitOutcome {
  not_home = 'not_home',
  contacted = 'contacted',
  promised = 'promised',
  paid = 'paid',
  escalated = 'escalated',
}
