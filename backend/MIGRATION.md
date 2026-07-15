# Long Route data migration

The Long Route module is an additive CDK migration. It does not rename or delete the live `TripsTable` or `BookingsTable`.

## Existing resources

- Existing trip and booking items remain readable through `/trips` and `/bookings`.
- New long-route records use a `module: "LONG_ROUTE"` discriminator and richer attributes on the same retained tables.
- New `byRoute` (trips) and `byTrip` (bookings) indexes are added without changing primary keys. Each existing table receives only one new index in this deployment, which keeps the update compatible with DynamoDB's one-index-per-table update constraint.

## New retained tables

- `VehiclesTable`: approved operator vehicles and layout template selection.
- `DriverVerificationsTable`: Driver profile, ID/selfie/vehicle checklist, submission state, and Admin decision.
- `TripSeatsTable`: exact seat state, five-minute holds, prices, and booking links.
- `BookingPassengersTable`: per-seat passenger and check-in information.
- `PaymentsTable`: provider references and payment/refund status only; card data is never stored.
- `TravelRequestsTable`, `ReviewsTable`, and `NotificationsTable`: advanced module records.
- `DriverVerificationUploads`: private S3 evidence storage. Mobile uploads and Admin review use short-lived signed URLs; objects are never public.

## Driver verification rollout

Drivers can sign in and browse their complete Driver space in every verification state. Both legacy and long-route trip creation APIs require an `APPROVED` Driver verification record, and the linked vehicle must also be approved. The Admin API can list verification requests at `GET /admin/driver-verifications` and approve or reject one at `PATCH /admin/driver-verifications/{driverId}`. These routes require membership in the Cognito `administrators` group.

Deploy with `npm run build`, `npx cdk diff`, and then `npx cdk deploy` from `backend/`. Existing simple trips can be upgraded lazily by an operator when a vehicle/layout is assigned.

## Passenger and Driver account types

The Cognito user pool stores `PASSENGER` or `DRIVER` in the standard `profile` claim, which is already present in the live pool schema. New registrations choose this once during sign-up, and the app does not expose any role-switching control. API handlers enforce the claim for booking and driver operations.

Existing users without the value are treated as Passenger accounts for backward compatibility. Members of the `verified_drivers` Cognito group are recognized as Driver accounts. If an older driver is not in that group, set `profile=DRIVER` once with an administrator migration command or script. Do not expose this migration as an in-app role switch.
