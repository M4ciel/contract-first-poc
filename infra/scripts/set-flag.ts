// Turns a feature flag on or off in AWS AppConfig (MiniStack locally) by deploying a new version
// of the `feature-flags` profile, the same way a release manager would in the AWS console.
// The backend polls AppConfig, so the change is live within one poll interval, without a restart.
//
// Usage: node infra/scripts/set-flag.ts <flag> <on|off>     (or: nx run @acme/infra:flag --args="booksV2 on")
import {
  AppConfigClient,
  CreateHostedConfigurationVersionCommand,
  ListApplicationsCommand,
  ListConfigurationProfilesCommand,
  ListDeploymentStrategiesCommand,
  ListEnvironmentsCommand,
  StartDeploymentCommand,
} from '@aws-sdk/client-appconfig';

const FLAGS = { booksV2: 'GET /v2/books (alpha)' } as const;
type Flag = keyof typeof FLAGS;

const [flagArg, stateArg] = process.argv.slice(2);
if (!flagArg || !(flagArg in FLAGS) || (stateArg !== 'on' && stateArg !== 'off')) {
  console.error(`Usage: set-flag.ts <${Object.keys(FLAGS).join('|')}> <on|off>`);
  process.exit(1);
}
const flag = flagArg as Flag;
const enabled = stateArg === 'on';

const client = new AppConfigClient({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  endpoint: process.env['AWS_ENDPOINT_URL'] ?? 'http://localhost:4566',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

const byName = <T extends { Name?: string | undefined }>(
  items: T[] | undefined,
  name: string,
): T => {
  const item = items?.find((candidate) => candidate.Name === name);
  if (!item) throw new Error(`${name} not found in AppConfig. Is the environment up?`);
  return item;
};

const application = byName(
  (await client.send(new ListApplicationsCommand({}))).Items,
  'acme-library',
);
const ApplicationId = application.Id;
const environment = byName(
  (await client.send(new ListEnvironmentsCommand({ ApplicationId }))).Items,
  'local',
);
const profile = byName(
  (await client.send(new ListConfigurationProfilesCommand({ ApplicationId }))).Items,
  'feature-flags',
);
const strategy = byName(
  (await client.send(new ListDeploymentStrategiesCommand({}))).Items,
  'acme-all-at-once',
);

// Same document shape as infra/terraform/library.tf. Other flags keep their default (off).
const document = {
  version: '1',
  flags: Object.fromEntries(
    Object.entries(FLAGS).map(([name, description]) => [name, { name, description }]),
  ),
  values: Object.fromEntries(
    Object.keys(FLAGS).map((name) => [name, { enabled: name === flag ? enabled : false }]),
  ),
};

const version = await client.send(
  new CreateHostedConfigurationVersionCommand({
    ApplicationId,
    ConfigurationProfileId: profile.Id,
    ContentType: 'application/json',
    Content: new TextEncoder().encode(JSON.stringify(document)),
  }),
);
await client.send(
  new StartDeploymentCommand({
    ApplicationId,
    EnvironmentId: environment.Id,
    ConfigurationProfileId: profile.Id,
    ConfigurationVersion: String(version.VersionNumber),
    DeploymentStrategyId: strategy.Id,
  }),
);
console.log(
  `✔ ${flag} is now ${stateArg} (version ${version.VersionNumber}); the backend picks it up within 15 s.`,
);
