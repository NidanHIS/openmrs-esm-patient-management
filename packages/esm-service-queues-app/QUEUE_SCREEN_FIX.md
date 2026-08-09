# Queue screen: patient queue grid and location mapping

## Problem

The screen used `/queueutil/active-tickets`, which returns only the patient currently called for each room. It could
therefore display one card even when several non-ended queue entries existed.

The location picker originally trusted only FHIR locations tagged `queue location`. The live system has an IPD queue
definition, but its Inpatient (IPD) location is not tagged, so IPD could not be selected. The service picker also used
services from every location, which allowed an IPD-only service to be selected while OPD was selected and produced a
misleading empty screen.

The later `Cannot access 'eq' before initialization`, React error 31, chunk-load, and `Unexpected token '<'` errors
were caused by a cached `10.0.2` app shell loading chunks from a different deployment. The frontend also returned
`index.html` with status 200 when a JavaScript chunk was missing, so the browser tried to parse HTML as JavaScript.

The blank OpenMRS page found during final validation had a separate infrastructure cause: Docker killed the OpenMRS
backend for exceeding the shared VM memory, and the backend had no restart policy. The Docker configuration now uses a
bounded JVM heap and `restart: unless-stopped`, so the API recovers instead of leaving the SPA without a session
endpoint.

## Minimal fix

- Fetch every page of non-ended entries from `/queue-entry?isEnded=false` using the server's 100-entry limit.
- Read each ticket number from the configured visit attribute.
- Show the patient's full name, ticket number, and room.
- Filter by the location and service selected in the queue-screen header.
- Build location and service choices directly from queue definitions, so OPD, IPD, and future queues are available
  without a redundant FHIR request or hardcoded UUIDs/names.
- Limit service choices to the selected location and clear a saved service if it belongs to another location.
- Map tickets by `queue.location.uuid` and `queue.service.uuid`; ticket prefixes such as `OUT-` or `IPD-` are never used
  to decide the location.
- Put the currently called ticket first, then order the remaining patients by priority and arrival time.
- Render four cards per desktop row, then wrap later patients onto the next row without horizontal scrolling.
- Refresh the data every three seconds.
- Prepare the cleaned source as `10.0.2-nidan.6`. The last deployed build remains `10.0.2-nidan.5` until the later
  shipping step. The frontend cache safeguards return a real 404 for missing JavaScript so browsers cannot mix chunks
  from different builds.

## Files intentionally changed

- `src/queue-screen/useActiveTickets.ts`: fetches and orders the complete queue line.
- `src/queue-screen/queue-screen.component.tsx`: renders every patient card.
- `src/queue-screen/queue-screen.scss`: provides the responsive four-column grid.
- `src/queue-screen/queue-screen.test.tsx`: verifies three patients render in order.
- `src/queue-screen/useActiveTickets.test.ts`: verifies UUID-based OPD, IPD, service, and All filtering.
- `src/patient-queue-header/patient-queue-header.component.tsx`: derives locations/services from queue definitions and
  recovers stale saved filters.
- `src/patient-queue-header/patient-queue-header.test.tsx`: verifies OPD/IPD/All choices and stale location/service
  recovery.
- `package.json`: uses the Nidan package version so browsers load a fresh bundle.
- `QUEUE_SCREEN_FIX.md`: records this work.

The Docker deployment additionally contains the configured visit-attribute UUID, rebuilt queue package, the two
frontend cache-safety files required to prevent stale chunk errors, and the OpenMRS backend memory/restart guard. No
queue-creation, call-modal, Odoo, proxy, or unrelated OpenMRS application files are part of this final patch.

## Run locally

```bash
yarn start --backend http://localhost
```

Open `http://localhost/openmrs/spa/home/service-queues/screen`.

## Expected result

Every non-ended patient for the selected location/service appears in a four-column desktop grid. Patient five starts a
new row. When a patient is called, that card moves to the first position and shows **Now serving**; the other patients
remain visible in queue order. OPD shows only OPD patients/services, IPD shows only IPD patients/services, and All
combines all queue locations. The grid reduces to two columns and then one column on narrower screens.

## Verification

- Queue-screen, location-header, and mapping tests: 16 passed.
- TypeScript and ESLint: passed.
- Production build: passed (with only the existing bundle-size warning).
- Live API audit of the deployed `nidan.5` build: session, queue definitions, non-ended entries, active tickets, and
  FHIR locations all returned HTTP 200.
- Live mapping audit: nine queue definitions include OPD and IPD. OPD maps to `Clinical Consult(OPD)`, IPD maps to
  `IPD Care`, and All maps to services from all nine queue locations. Only eight locations carry the FHIR queue tag;
  deriving filters from queue definitions therefore prevents the missing IPD tag from hiding that queue.
- Current live data contains four non-ended OPD entries and no IPD entry. Mixed-patient regression tests therefore
  validate IPD and All without mutating production patient data.
- Existing `nidan.5` deployment: all 51 local import-map entrypoints and all 111 queue JavaScript assets returned
  successfully. `nidan.6` is packed into the Docker source branch but is not deployed yet.
- Full package suite: 110 tests passed; seven pre-existing tests in untouched home/table-duration files retain stale text
  and accessibility expectations and are not queue-screen runtime failures.
- Backend recovery: healthy with the configured restart policy and stable at approximately 996 MiB during the final
  memory sample.
- Final in-app-browser validation could not run because no in-app browser session was connected
  (`Browser is not available: iab`). The `nidan.6` source was not deployed as requested, so its final visual click-through
  remains part of the later shipping step.
