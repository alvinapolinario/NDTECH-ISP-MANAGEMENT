# MikroTik Integration

## Modes

Set in `D:\ISP\.env`:

| Variable | Value | Behavior |
|----------|-------|----------|
| `MIKROTIK_USE_MOCK=true` | Development | Returns sample PPPoE data without contacting a router |
| `MIKROTIK_USE_MOCK=false` | Production | Uses RouterOS API via `node-routeros` |

## PPPoE Sessions

PPPoE Sessions are loaded from MikroTik **`/ppp/active/print`**:

1. Select a router on **Network → PPPoE Sessions**
2. The API refreshes active connections from the router
3. All online sessions are listed, including users not yet linked to a CRM account

Linked CRM customers appear when the active username matches a `pppoe_accounts` row for that router.

## Router requirements

On RouterOS:

```routeros
/ip service enable api
/ip service set api port=8728 disabled=no
```

Ensure the API server can reach the router host/port and the API user can read PPP data.

## Router credentials

Router passwords are encrypted with `MIKROTIK_SECRET_KEY`. If decryption fails after changing that key, edit each router and re-enter its password.

## Implemented RouterOS commands

| App action | RouterOS command |
|------------|------------------|
| Test connection | `/system/identity/print` |
| Sync PPPoE accounts | `/ppp/secret/print` |
| Browse PPPoE sessions | `/ppp/active/print` |
| Enable account | `/ppp/secret/enable` |
| Disable / suspend account | `/ppp/secret/disable` |

All commands are logged in `mikrotik_command_logs`.
