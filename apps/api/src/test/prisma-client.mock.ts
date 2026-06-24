export class PrismaClient {
  user = {};
  role = {};
  permission = {};
  userRole = {};
  rolePermission = {};
  auditLog = {};
  notification = {};

  constructor(_options?: unknown) {}

  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }

  $transaction(value: unknown) {
    return Promise.resolve(value);
  }
}
