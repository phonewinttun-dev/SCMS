import 'package:scms_mobile/src/core/config/app_config.dart';

/// API base URL for functional tests. Override with `--dart-define`.
const functionalTestApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5140/',
);

const functionalTestConfig = AppConfig(
  flavor: AppFlavor.development,
  apiBaseUrl: functionalTestApiBaseUrl,
  enableNetworkLogging: false,
  connectTimeoutSeconds: 30,
  receiveTimeoutSeconds: 30,
);

/// Demo patient credentials from AGENTS.md (SQLite seed).
const demoPatientEmail = String.fromEnvironment(
  'TEST_USER_EMAIL',
  defaultValue: 'aung.min@example.test',
);

const demoPatientPassword = String.fromEnvironment(
  'TEST_USER_PASSWORD',
  defaultValue: 'password',
);

const demoDoctorEmail = String.fromEnvironment(
  'TEST_DOCTOR_EMAIL',
  defaultValue: 'dr.thandar@scms.demo',
);

const demoDoctorPassword = String.fromEnvironment(
  'TEST_DOCTOR_PASSWORD',
  defaultValue: 'password',
);
