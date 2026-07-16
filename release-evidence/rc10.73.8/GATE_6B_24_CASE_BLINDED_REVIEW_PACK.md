# Gate 6B 24-case blinded review pack

Generated: 2026-07-16T16:39:05.699Z

This package contains source evidence and review questions only. It contains no model-generated or provisional answer. Presentation-only trailing whitespace is removed without changing source identity or the manifest's original excerpt hash. Independent review status: **not started**. Production accepted: **false**.

Benchmark fingerprint: `sha256:f11583bc507e3abdd88e4a5f914c27fdde6ab71e4e9d3594a59151f168cd9974`.

## G6B1-01

- Evidence ID: `BEV-f4e684d09a9fb9f2589375ce`
- Repository: `Azure/ResourceModules`
- Source authority: `official-reference-architecture`
- Category under review: `source-example`
- Architecture group: `ACFG-bba1a9bad7f0d46d082d3624`

### Bounded evidence

```text
The following sample shows how you could orchestrate a deployment of multiple resources using modules from a private Bicep Registry. In this example, we will deploy a resource group with a Network Security Group (NSG), and use them in a subsequent VNET deployment.

> **Note**: the preferred method to publish modules to the Bicep registry is to leverage the [CI environment](./The%20CI%20environment) provided in this repository. However, this option may not be applicable to all scenarios (ref e.g., the [Consume library](./Getting%20started%20-%20Scenario%201%20Consume%20library) section). As an alternative, the same [`Publish-ModuleToPrivateBicepRegistry.ps1`](https://github.com/Azure/ResourceModules/blob/main/utilities/pipelines/resourcePublish/Publish-ModuleToPrivateBicepRegistry.ps1) script leveraged by the publishing step of the CI environment pipeline can also be run locally.

```bicep
targetScope = 'subscription'

// ================ //
// Input Parameters //
// ================ //

// RG parameters
@description('Optional. The name of the resource group to deploy')
param resourceGroupName string = 'validation-rg'

@description('Optional. The location to deploy into')
param location string = deployment().location

// =========== //
// Deployments //
// =========== //

// Resource Group
module rg 'br/modules:resources.resource-group:1.0.0' = {
  name: 'registry-rg'
  params: {
    name: resourceGroupName
    location: location
  }
}

// Network Security Group
module nsg 'br/modules:network.network-security-group:1.0.0' = {
  name: 'registry-nsg'
  scope: resourceGroup(resourceGroupName)
  params: {
    name: 'defaultNsg'
  }
  dependsOn: [
```

### Review questions

- What does the worked example demonstrate?
- Which conclusions would over-generalise the example?

## G6B1-02

- Evidence ID: `BEV-53bc04b94c6a9116788e7543`
- Repository: `Azure/ResourceModules`
- Source authority: `official-reference-architecture`
- Category under review: `source-example-implementation-structure`
- Architecture group: `ACFG-bba1a9bad7f0d46d082d3624`

### Bounded evidence

```text
Module test files in CARML are implemented using comprehensive `.bicep` test files that not only test the module's template in a certain scenario, but also deploy any required dependency for it.

Module test files follow these general guidelines:

- A module should have as many module test files as it needs to evaluate all parts of the module's functionality.
- Sensitive data should not be stored inside the module test file but rather be injected by the use of tokens, as described in the [Token replacement](./The%20CI%20environment%20-%20Token%20replacement) section, or via a [Key Vault reference](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/key-vault-parameter?tabs=azure-cli#reference-secrets-with-static-id).

Test folder guidelines:

- Each scenario should be setup in its own sub-folder (e.g. `.test/linux`)
- Sub-folder names should ideally relate to the content they deploy. For example, a sub-folder `min` should be chosen for a scenario in which only the minimum set of parameters, i.e., only required parameters, are used to deploy the module.
- Each folder should contain at least a file `main.test.bicep` and optionally an additional `dependencies.bicep` file.

Test file (`main.test.bicep`) guidelines:

- The `main.test.bicep` file should deploy any immediate dependencies (e.g. a resource group, if required) and invoke the module's main template while providing all parameters for a given test scenario.
- Parameters
  - Each file should define a parameter `serviceShort`. This parameter should be unique to this file (i.e, no two test files should share the same) as it is injected into all resource deployments, making them unique too and account for corresponding requirements.
    - As a reference you can create a identifier by combining a substring of the resource type and test scenario (e.g., in case of a Linux Virtual Machine Deployment: `vmlin`).
    - For the substring, we recommend to take the first character and subsequent upper-case characters from the resource type identifier and combine them into one string. Following you can find a few examples for reference:
      - `Microsoft.DBforPostgreSQL/flexibleServers` with a test folder `common` could be: `dfpsfscom`
      - `Microsoft.Storage/storageAccounts` with a test folder `min` could be: `ssamin`
      > **Note:** If the combination of the `servicesShort` with the rest of a resource name becomes too long, it may be necessary to bend the above recommendations and shorten the name. This can especially happen when deploying resources such as Virtual Machines or Storage Accounts that only allow comparatively short names.
  - If the module deploys a resource group level resource, the template should further have a `resourceGroupName` parameter and subsequent resource deployment. As a reference for the default name you can use `ms.<providerNamespace>.<resourceType>-${serviceShort}-test-rg`.
  - Each file should also provide a `location` parameter that may default to the deployments default location
- It is recommended to define all major resource names in the `main.test.bicep` file as it makes later maintenance easier. To implement this, make sure to pass all resource names to any referenced module.
- Further, for any test file (including the `dependencies.bicep` file), the usage of variables should be reduced to the absolute minimum. In other words: You should only use variables if you must use them in more than one place. The idea is to keep the test files as simple as possible
- References to dependencies should be implemented using resource references in combination with outputs. In other words: You should not hardcode any references into the module template's deployment. Instead use references such as `nestedDependencies.outputs.managedIdentityPrincipalId`
- If any diagnostic resources (e.g., a Log Analytics workspace) are required for a test scenario, you can reference the centralized `modules/.shared/.templates/diagnostic.dependencies.bicep` template. It will also provide you with all outputs you'd need.

> :scroll: [Example of test file](https://github.com/Azure/ResourceModules/blob/main/modules/AnalysisServices/servers/.test/common/main.test.bicep)

Dependency file (`dependencies.bicep`) guidelines:

- The `dependencies.bicep` should optionally be used if any additional dependencies must be deployed into a nested scope (e.g. into a deployed Resource Group).
- Note that you can reuse many of the assets implemented in other modules. For example, there are many recurring implementations for Managed Identities, Key Vaults, Virtual Network deployments, etc.

  - A special case to point out is the implementation of Key Vaults that require purge protection (for example, for Customer Managed Keys). As this implies that we cannot fully clean up a test deployment, it is recommended to generate a new name for this resource upon each pipeline run using the output of the `utcNow()` function at the time.
```

### Review questions

- Which module-test structure is demonstrated?
- Which conclusions require evidence beyond this example?

## G6B1-03

- Evidence ID: `BEV-b52e41d91d436a91aca36b8b`
- Repository: `asyncapi/spec`
- Source authority: `official-specification-or-standard`
- Category under review: `interfaces-and-data-obligations`
- Architecture group: `ACFG-a1249e53361ad3146d537a2f`

### Bounded evidence

```text
asyncapi: 3.1.0

info:
  title: Kraken Websockets API
  version: '1.8.0'
  description: |
    WebSockets API offers real-time market data updates. WebSockets is a bidirectional protocol offering fastest real-time data, helping you build real-time applications. The public message types presented below do not require authentication. Private-data messages can be subscribed on a separate authenticated endpoint.

    ### General Considerations

    - TLS with SNI (Server Name Indication) is required in order to establish a Kraken WebSockets API connection. See Cloudflare's [What is SNI?](https://www.cloudflare.com/learning/ssl/what-is-sni/) guide for more details.
    - All messages sent and received via WebSockets are encoded in JSON format
    - All decimal fields (including timestamps) are quoted to preserve precision.
    - Timestamps should not be considered unique and not be considered as aliases for transaction IDs. Also, the granularity of timestamps is not representative of transaction rates.
    - At least one private message should be subscribed to keep the authenticated client connection open.
    - Please use REST API endpoint [AssetPairs](https://www.kraken.com/features/api#get-tradable-pairs) to fetch the list of pairs which can be subscribed via WebSockets API. For example, field 'wsname' gives the supported pairs name which can be used to subscribe.
    - Cloudflare imposes a connection/re-connection rate limit (per IP address) of approximately 150 attempts per rolling 10 minutes. If this is exceeded, the IP is banned for 10 minutes.
    - Recommended reconnection behaviour is to (1) attempt reconnection instantly up to a handful of times if the websocket is dropped randomly during normal operation but (2) after maintenance or extended downtime, attempt to reconnect no more quickly than once every 5 seconds. There is no advantage to reconnecting more rapidly after maintenance during cancel_only mode.


channels:
  ping:
    address: /
    messages:
      ping:
        $ref: '#/components/messages/ping'
  pong:
    address: /
    messages:
      pong:
        $ref: '#/components/messages/pong'

  heartbeat:
    address: /
    messages:
      heartbeat:
        $ref: '#/components/messages/heartbeat'

  systemStatus:
    address: /
```

### Review questions

- Which interface and security obligations are directly stated?
- Which statements are recommendations rather than requirements?

## G6B1-04

- Evidence ID: `BEV-45a8396b1620b74a67ac57ae`
- Repository: `asyncapi/spec`
- Source authority: `official-specification-or-standard`
- Category under review: `machine-readable-source-example`
- Architecture group: `ACFG-a1249e53361ad3146d537a2f`

### Bounded evidence

```text
asyncapi: 3.1.0
info:
  title: Streetlights Kafka API
  version: 1.0.0
  description: "The Smartylighting Streetlights API allows you to remotely manage the city lights.\n\n### Check out its awesome features:\n\n* Turn a specific streetlight on/off \U0001F303\n* Dim a specific streetlight \U0001F60E\n* Receive real-time information about environmental lighting conditions \U0001F4C8\n"
  license:
    name: Apache 2.0
    url: 'https://www.apache.org/licenses/LICENSE-2.0'
defaultContentType: application/json
servers:
  test:
    host: 'test.mykafkacluster.org:8092'
    protocol: kafka-secure
    description: Test broker
    security:
      - $ref: '#/components/securitySchemes/saslScram'
  test_oauth:
    host: 'test.mykafkacluster.org:8093'
    protocol: kafka-secure
    description: Test port for oauth
    security:
      - type: oauth2
        description: The oauth security descriptions
        flows:
          clientCredentials:
            tokenUrl: 'https://example.com/api/oauth/dialog'
            availableScopes:
              'streetlights:read': Scope required for subscribing to channel
              'streetlights:write': Scope required for publishing to channel
        scopes:
          - 'streetlights:write'
          - 'streetlights:read'
channels:
  lightingMeasured:
    address: 'smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured'
    messages:
      lightMeasured:
        $ref: '#/components/messages/lightMeasured'
    description: The topic on which measured values may be produced and consumed.
    servers:
```

### Review questions

- Which interface and security facts are directly observable?
- Which claims require abstention?

## G6B1-05

- Evidence ID: `BEV-0053bcdba65df5d1e58fdbf4`
- Repository: `oam-dev/spec`
- Source authority: `official-specification-or-standard`
- Category under review: `contradiction-and-scope-tension`
- Architecture group: `none`

### Bounded evidence

```text
This model, in its current form, does not mandate a specific set of security policies. However, it does provide guidance on certain aspects of security:

- OCI/Docker images MUST be referenced by SHA wherever possible
- File formats MUST be converted to a canonical format so that they can be hashed

When these two conditions are satisfied, systems can be constructed in which a digest verification of schematics will preserve the immutability of all components of the system. To wit, if a schematic references an image with a hash, then the process to verify the digest of the schematic also ensures that the image pulled has the same reference used to generate the schematic.

Other security details, such as network transport security or securing data at rest, are considered beyond the scope of this model.

| Previous      | Next        |
| ------------- |-------------|
| [7. Application Configuration](7.application.md)  | [9. Design Principles](9.design_principles.md) |
```

### Review questions

- Does the passage contain a true contradiction or a scoped distinction?
- Identify both sides before judging.

## G6B1-06

- Evidence ID: `BEV-79d04db6eab52cfde71559fc`
- Repository: `MicrosoftDocs/architecture-center`
- Source authority: `official-reference-architecture`
- Category under review: `security-reference-architecture`
- Architecture group: `ACFG-62ff83fd2947cbe12c243453`

### Bounded evidence

```text
The networking components include the following resources:

- **Virtual network:** Every VM is deployed into a virtual network that gets segmented into subnets.

- **Network interface card (NIC):** The NIC connects the VM to the virtual network and handles all inbound and outbound traffic. Each [VM size](/azure/virtual-machines/sizes) defines a maximum number of NICs.

- **Public IP address:** A public IP address *can* be used to communicate with the VM from outside Azure via SSH. However, this option is discouraged because it's a potential security risk.

  > [!WARNING]
  > Avoid attaching a public IP address directly to a VM. *Only* do so in extreme circumstances and include other security measures, such as using network security groups (NSGs) to filter traffic.

  For management access to a VM, use Azure Bastion for browser-based SSH access, or connect privately through a VPN or Azure ExpressRoute.

  - The public IP address can be dynamic or static. The default is dynamic. Reserve a [static IP address](/azure/virtual-network/virtual-networks-reserved-public-ip) when you need a fixed IP address that doesn't change, for example, if you need to create a DNS 'A' record or add the IP address to a safe list.

  - You can also create a fully qualified domain name (FQDN) for the IP address. You can then register a [CNAME record](https://en.wikipedia.org/wiki/CNAME_record) in DNS that points to the FQDN. For more information, see [Create a fully qualified domain name for a VM](/azure/virtual-machines/create-fqdn).

- **NSG:** Use [NSGs](/azure/virtual-network/network-security-groups-overview) to allow or deny network traffic to VMs and subnets. Associate them with the subnets or with individual NICs attached to VMs.

  All NSGs contain a set of [default security rules](/azure/virtual-network/security-overview#default-security-rules), including a rule that blocks all inbound internet traffic. You can't delete the default rules, but you can override them with other rules. For example, you can create rules that allow inbound internet traffic to specific ports, such as port 443 for HTTPS.

- **Azure Network Address Translation (NAT) Gateway:** [Azure NAT Gateway](/azure/nat-gateway) allows all instances in a private subnet to connect outbound to the internet while remaining fully private. Only packets that arrive as response packets to an outbound connection can pass through a NAT gateway. Unsolicited inbound connections from the internet aren't permitted.

  > [!NOTE]
  > To improve default security, implicit outbound internet access is being deprecated for all new virtual networks. You need to explicitly configure outbound internet connectivity by using other resources such as NAT Gateway, Azure Standard Load Balancers, or firewalls. For more information, see [Default outbound access in Azure](/azure/virtual-network/ip-services/default-outbound-access).

- **Azure Bastion:** [Azure Bastion](/azure/bastion/) is a fully managed platform as a service (PaaS) solution that provides secure access to VMs via private IP addresses. With this configuration, VMs don't need a public IP address that exposes them to the internet, which increases their security posture. Azure Bastion provides secure Remote Desktop Protocol (RDP) or SSH connectivity to your VMs directly over Transport Layer Security (TLS) by using various methods, including the Azure portal, or native SSH or RDP clients.
```

### Review questions

- Identify security obligations and recommendations.
- Which Architecture Genome fields are supported?

## G6B1-07

- Evidence ID: `BEV-48b0cb0824957d14e5044e65`
- Repository: `MicrosoftDocs/architecture-center`
- Source authority: `official-reference-architecture`
- Category under review: `resilience-and-performance`
- Architecture group: `ACFG-62ff83fd2947cbe12c243453`

### Bounded evidence

```text
Performance Efficiency refers to your workload's ability to scale to meet user demands efficiently. For more information, see [Design review checklist for Performance Efficiency](/azure/well-architected/performance-efficiency/checklist).

Performance Efficiency helps you minimize latency, achieve scalable architectures, optimize resource utilization, and continuously improve system performance. The decisions that you make regarding workload architecture, VM size, and disk configurations can greatly affect your workload performance. Making the right choices can prevent the need to rearchitect the solution in the future, add flexibility, and save costs.

Consider these points when you develop your architecture:

- Use virtual machine scale sets if the workload has a dynamic load. For example, scale out during times of high traffic and then scale back in when traffic drops. This approach ensures adequate processing power while still keeping costs under control.

- Choose the appropriate VM and disk SKUs to meet required IOPS during processing. Configure caching to further improve performance.

- If your workload is unusually latency-sensitive, use [proximity placement groups (PPGs)](/azure/virtual-machines/co-location) to ensure that multiple VMs are located physically close to each other to achieve better performance. You can also combine PPGs with availability sets to achieve low latency and high availability within a single physical datacenter.

- Where possible, enable accelerated networking to minimize latency between components.

- Design network architecture to minimize unnecessary hops.

- Use Azure Monitor and other tools to continuously analyze metrics and create updated performance baselines. Use the performance information to determine where to implement changes, and then test against those baselines.
```

### Review questions

- Which quality drivers and trade-offs are explicit?
- What conditions are required?

## G6B1-08

- Evidence ID: `BEV-8f946e0488f13c1df9469a2f`
- Repository: `MicrosoftDocs/architecture-center`
- Source authority: `official-reference-architecture`
- Category under review: `modernisation-observation`
- Architecture group: `ACFG-86a150763f90ab45c113f2a4`

### Bounded evidence

```text
After you've defined an MVP and done the engineering to lift, shift, and adapt, you need to focus on operating the SaaS service on behalf of your customers. This transformation is enormous. In the on-premises world, software providers create and ship the software, system integrators deploy it, and the customer’s IT organization or outsourced provider runs it. With SaaS, not only is the SaaS provider principally responsible for operating the service, but they're also responsible for operating it for hundreds to thousands of customers at the same time.

We learned a lot by operating Dynamics 365 in the cloud for a large and growing number of customers.

**Monitor**: As a service provider, customers expect you to detect service health issues before they do, and they expect you to immediately work on resolutions. A health issue isn't just when the service is down. A customer's view of a service being unhealthy includes the service performing slowly or behaving incorrectly. It's essential that you develop adequate monitoring tools&mdash;this development is part of your service, not an optional accessory.

**Communicate**: In the on-premises world, the customer can see their IT team working on a problem. In the cloud, they can’t. It's essential to communicate when you detect a service health issue, to keep communicating on the progress to resolution, and to confirm the *all clear* when the issue is resolved. The nature of the communications varies with the severity of the issue. Your communications pipeline is also a core part of your SaaS service, and you need to ensure that communications can succeed even when core parts of your SaaS service’s infrastructure are compromised.

**Whole-stack view**: In the on-premises world, the application provider is generally responsible for the application component, and the customer owns the underlying infrastructure. In the cloud, you're responsible for the whole stack. If the service has a health issue, the customer looks to you to detect, communicate, and repair, whether the issue is in the application or in the cloud platform it runs on.

**Automate**: If humans must perform manual steps in the operation of the service, they will inevitably make mistakes. Every possible action should be automated and logged. If an action is required on enough service nodes, automation is the only option. A great example is the database administration for Dynamics 365. With our decision to keep each tenant’s data in a separate Azure SQL database, we needed to develop automation to handle all the tasks typically performed by a DBA, for example, index maintenance and query optimization. For more information on how we manage databases at scale, see [Running 1M databases on Azure SQL for a large SaaS provider](https://devblogs.microsoft.com/azure-sql/running-1m-databases-on-azure-sql-for-a-large-saas-provider-microsoft-dynamics-365-and-power-platform/).

**Safe deployment**: Wherever possible, changes should follow a safe deployment process. First, changes are introduced to low-risk environments, for example, a cloud region with only smaller customers or less critical workloads. Next, they progress to a group of slightly larger, more complex customers until all customers are updated. At every step, there needs to be monitoring to evaluate whether the change is successful. If there's an issue, the process should stop the change rollout and mitigate issues, or roll it back where it has already been deployed. Safe deployment practices apply to both code and configuration changes. For more information, see [Advancing safe deployment practices](https://azure.microsoft.com/blog/advancing-safe-deployment-practices/).

**Live-site incident management**: For us, a *live-site incident* means that a customer is having an issue with our service in production that requires engineering engagement. It might be a health issue that we detect or an issue reported by the customer that our support teams aren't able to resolve on their own. Live-site excellence is critical to SaaS success. Here are a few key points from our experience:

- The engineering team should handle live-site incidents. In the past, many companies had separate operations or support engineering teams. We made an explicit choice to have our core engineering teams cover live-site incidents. They have the best expertise, and seeing issues first-hand inspires the right creativity and energy to drive real, rapid improvement and better future designs. It's something that needs to be considered when planning development schedules, but it drives great results.
- Live-site incident leadership is a skill, and it's hard work&mdash;recognize it, train for it, learn to hire for it, and reward it.
- The priority should be detection, isolation, and mitigation. Get the customer healthy again, and then worry about longer term improvements.

**Learn and improve**: Someone once said, “Never waste a good crisis.” Every live-site incident is an opportunity to improve. After mitigation is completed, make sure that you ask how to detect similar issues faster, how to correct the underlying issue to fully cure it, how to minimize the impact of similar issues, whether other similar issues might exist elsewhere in the service, and how to prevent the entire class of issues. Prioritizing these corrective actions improves service quality and reduces the demand for future live-site incidents. Service quality must improve over time, otherwise as you grow, the impact of every issue also gets higher.

**Shift left**: Issues that require the engagement of the live-site team are expensive. It takes time for issues to get to them, and the live-site team is a scarce resource that needs to be available for the most serious service health issues and management tasks.

Wherever possible, the best solution is eliminating an issue altogether, followed quickly by automated detection and automated mitigation. When that’s not possible, *shifting left* helps to empower the frontline support team to detect and correct the issue or perform the task, or even better, empower the customer to self-serve and perform the task themselves. The following diagram shows how support cases start with a customer, go to a frontline support team, and then to the engineering team. An arrow indicates that we shift the resolution action to the left to reduce the impact of incidents.

:::image type="content" alt-text="Diagram showing the resolution action directed by an arrow pointing to the left." source="./images/dynamics-365-journey-saas/shift-left.svg" border="false" :::

**Keep things standard**: It can be tempting to mitigate an issue by making special arrangements for one customer. At scale, everything that's special becomes a corner case that causes something else to fail. Aim to keep all tenants using standard code, settings, and configuration.
```

### Review questions

- Which operational lessons are observations?
- Which recommendations are source-stated?

## G6B1-09

- Evidence ID: `BEV-d04770a7fd02a158b96b119d`
- Repository: `MicrosoftDocs/architecture-center`
- Source authority: `official-reference-architecture`
- Category under review: `causal-pattern-dna`
- Architecture group: `ACFG-be877f533f0be94989c46628`

### Bounded evidence

```text
:::image type="complex" border="false" source="./images/event-driven.svg" alt-text="Diagram that shows an event-driven architecture style." lightbox="./images/event-driven.svg":::
   An arrow points from the Event producers section to the Event ingestion section. Three arrows point from the Event ingestion section to three sections that are all labeled Event consumers.
:::image-end:::

Events are delivered in near real time, so consumers can respond immediately to events as they occur. Producers are decoupled from consumers, which means that a producer doesn't know which consumers are listening. Consumers are also decoupled from each other, and in a publish-subscribe model, every consumer sees all of the events.

This process differs from a [Competing Consumers pattern](../../patterns/competing-consumers.md). In the Competing Consumers pattern, consumers pull messages from a queue. Each message is processed only one time, assuming that there are no errors. In some systems, such as [Azure IoT](/azure/iot/iot-introduction), events must be ingested at high volumes.

An event-driven architecture can use a [publish-subscribe model](../../patterns/publisher-subscriber.md) or an event stream model.

- **Publish-subscribe:** The publish-subscribe messaging infrastructure tracks subscriptions. When an event is published, it sends the event to each subscriber. After the event is received, it isn't stored in a durable log, so new subscribers don't see past events. We recommend that you use [Azure Event Grid](/azure/event-grid/overview) for publish-subscribe scenarios.

- **Event streaming:** Events are written to a log. Events are strictly ordered within a partition and are durable. Clients don't subscribe to the stream. Instead, a client can read from any part of the stream. The client is responsible for advancing their position in the stream, which means that a client can join at any time and can replay events. This replayability supports recovery scenarios, late-arriving consumers, and reprocessing after a bug fix. [Azure Event Hubs](/azure/event-hubs/event-hubs-about) is designed for high-throughput event streaming.

On the consumer side, there are some common variations:

- **Simple event processing:** An event immediately triggers an action in the consumer. For example, you can use [Azure Functions](/azure/azure-functions/functions-overview) with an [Event Grid trigger](/azure/azure-functions/functions-bindings-event-grid-trigger) or [Azure Service Bus trigger](/azure/azure-functions/functions-bindings-service-bus-trigger) so that your code runs when a message is published.

- **Basic event correlation:** A consumer processes a few discrete business events, correlates them by an identifier, and persists information from earlier events to use when it processes later events. Libraries like [NServiceBus](https://docs.particular.net/tutorials/nservicebus-sagas/1-saga-basics/) and [MassTransit](https://masstransit.io/documentation/configuration/sagas/overview) support this pattern.

- **Complex event processing:** A consumer uses a technology like [Azure Stream Analytics](/azure/stream-analytics/stream-analytics-introduction) to analyze a series of events and identify patterns in the event data. For example, you can aggregate readings from an embedded device over a time window and generate a notification if the moving average exceeds a specific threshold.

- **Event stream processing:** Use a data streaming platform, such as [Azure IoT Hub](/azure/iot-hub/iot-concepts-and-iot-hub), [Event Hubs](/azure/event-hubs/event-hubs-about), or [Event Hubs for Apache Kafka](/azure/event-hubs/azure-event-hubs-apache-kafka-overview), as a pipeline to ingest events and feed them to stream processors. The stream processors act to process or transform the stream. There might be multiple stream processors for different subsystems of the application. This approach is well-suited for IoT workloads.

The source of the events might be external to the system, such as physical devices in an IoT solution. In that case, the system must be able to ingest the data at the volume and throughput that the data source requires.

There are two primary approaches to structure event payloads. When you have control over your event consumers, you can decide on the payload structure for each consumer. This strategy allows you to mix approaches as needed within a single workload.

- **Include all required attributes in the payload:** Use this approach when you want consumers to have all available information without needing to query an external data source. Larger payloads increase transport cost and bandwidth consumption, and can lead to data consistency problems because of multiple [systems of record](https://wikipedia.org/wiki/System_of_record), especially after updates. Contract management and versioning can also become complex.

- **Include only keys in the payload:** In this approach, consumers retrieve the necessary attributes, such as a primary key, to independently fetch the remaining data from a data source. This method provides better data consistency because it has a single system of record. However, it can have worse performance than the first approach because consumers must query the data source frequently. You have fewer concerns regarding coupling, bandwidth, contract management, or versioning because smaller events and simpler contracts reduce complexity. For more information, see [Put your events on a diet](https://particular.net/blog/putting-your-events-on-a-diet).

In the preceding diagram, each type of consumer is shown as a single box. To avoid having the consumer become a single point of failure in the system, it's typical to have multiple instances of a consumer. Multiple instances might also be required to handle the volume and frequency of events. A single consumer can process events on multiple threads. This setup can create challenges if events must be processed in order or require exactly-once semantics. For more information, see [Minimize coordination](/azure/architecture/guide/design-principles/minimize-coordination).

There are two primary topologies in event-driven architectures:

- **Broker topology:** Components broadcast events to the entire system. Other components either act on the event or ignore the event. This topology is useful when the event processing flow is relatively simple. There's no central coordination or orchestration, so this topology can be dynamic.

  This topology is highly decoupled, which helps provide scalability, responsiveness, and component fault tolerance. No component owns or is aware of the state of any multistep business transaction, and actions are taken asynchronously. As a result, distributed transactions are risky because there's no built-in mechanism for restarting or replaying them. You need to carefully consider error handling and manual intervention strategies because this topology can be a source of data inconsistency.
```

### Review questions

- Extract cause, mechanism, consequence, and trade-off.
- Distinguish topology alternatives.

## G6B1-10

- Evidence ID: `BEV-53e36cd2165eec1cffd76493`
- Repository: `finos/ai-reference-architecture-library`
- Source authority: `official-reference-architecture`
- Category under review: `agentic-architecture-genome`
- Architecture group: `ACFG-88704d96d75b40ac55fba4fd`

### Bounded evidence

```text
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://finos.org/schemas/fsi-agent-card/v1.0.0",
  "title": "FSI Agent Card",
  "description": "An extended Agent Card schema for AI agents deployed within financial institutions. It grounds the A2A Agent Card standard in the governance, regulatory compliance, and risk management requirements of the financial services industry.",
  "type": "object",
  "required": [
    "schemaVersion",
    "name",
    "description",
    "url",
    "version",
    "provider",
    "capabilities",
    "defaultInputModes",
    "defaultOutputModes",
    "securitySchemes",
    "skills",
    "governance",
    "dataHandling",
    "compliance",
    "agentSecurity"
  ],
  "properties": {

    "schemaVersion": {
      "type": "string",
      "description": "Version of the FSI Agent Card schema. This is the schema version, not the agent version. Use semantic versioning (e.g. '1.0.0')."
    },

    "name": {
      "type": "string",
      "description": "Human-readable display name of the agent."
    },

    "description": {
      "type": "string",
      "description": "Description of the agent's purpose, scope, and intended function within the institution. Include what the agent does not do as well as what it does."
    },
```

### Review questions

- Which agent-card fields are directly represented?
- Which governance controls belong in the Architecture Genome?

## G6B1-11

- Evidence ID: `BEV-ba42951a9a7b05050d9a36c7`
- Repository: `finos/ai-reference-architecture-library`
- Source authority: `official-reference-architecture`
- Category under review: `agentic-governance-cross-field`
- Architecture group: `ACFG-88704d96d75b40ac55fba4fd`

### Bounded evidence

```text
A common and reasonable question when reviewing this schema is: why do governance record fields such as `modelRisk.lastValidationDate` or `provider.businessOwner` appear in the Agent Card at all? Those fields live in HR systems, model inventories, and risk registers. Why duplicate them here?

The answer is that the Agent Card is not a record-keeping system. It is a **self-contained trust signal** consumed at the moment a decision is being made. An orchestrator delegating a task, a gateway enforcing a policy, or a CI/CD pipeline approving a promotion cannot call multiple internal systems to reconstruct the full picture before acting. The card needs to be useful in isolation.

The table below explains why each FSI extension field belongs in the card. It is honest about how each field can be used.

**How to read the "How it is used" column:**

- **Runtime decision:** An orchestrator or gateway can read this field from the card at call time and make an automated trust or routing decision from its value alone.
- **Deployment gate:** A CI/CD pipeline or onboarding checklist can check this field during promotion and block or flag the deployment based on its value.
- **Provisioning:** A platform or system reads this field once at setup time to configure itself (log storage, monitoring thresholds, DLP rules). It does not need to be read again on every call.
- **Informational:** This field declares a fact (who owns this agent, which regulations apply, what legal basis governs data processing). Automated enforcement requires separate systems configured independently. The card provides the declaration; it does not substitute for the governance process.

Many fields serve more than one purpose. Where that is the case, all purposes are listed.

> **Important:** Whether any of these fields produces an automated control in your environment depends entirely on what your orchestration platform, gateway, and CI/CD tooling support. The table describes what is *possible* given the field's content. It does not imply that every institution will or should implement every control listed.

| Field | Why this field belongs in the card | How it is used |
|:---|:---|:---|
| `governance.autonomyLevel` | An orchestrator routing a task to this agent needs to know its autonomy ceiling before delegating. A gateway cannot safely route a task requiring A1 oversight to an A4 agent without this value. | **Runtime decision** and **Deployment gate**: Orchestrators and gateways can enforce maximum autonomy level per task class. Promotion gates can block agents above a permitted ceiling for a given environment. |
| `governance.autonomyLevelJustification` | A reviewer challenging the assigned level needs this to evaluate whether the implementation actually enforces what the level claims. It is not enough to assert A2; the reasoning must be present. | **Informational**: Used by model risk teams, governance reviewers, and auditors during assessment. Not machine-enforceable from the card alone. |
| `governance.modelRiskTier` | Tier determines the intensity of validation, monitoring, and change management the institution must apply. Callers in environments that enforce tier-based access policies need this value. | **Runtime decision** (in environments with tier-based routing policies) and **Informational** (for risk and audit teams reading the card). Deployment gates can require a corresponding model inventory entry. |
| `governance.humanOversightModel` | Callers and orchestrators must understand the oversight pattern to configure their own human-in-the-loop controls correctly before integrating with this agent. | **Runtime decision** and **Deployment gate**: Human oversight platforms configure checkpoint workflows from this value. Deployment gates validate consistency with `autonomyLevel`. |
| `governance.approvedActionList` | Without a machine-readable scope boundary, no external system can verify that the agent is acting within its  authorized remit. | **Runtime decision** and **Deployment gate**: Orchestrators can validate proposed actions against this list before delegation. Gates verify it is present and non-empty for A2 and above. |
| `governance.approvedAgentRegistry` | In multi-agent architectures, delegation decisions must be checked against a known-good list. Querying a separate registry at delegation time introduces latency and a dependency that may be unavailable. | **Runtime decision** and **Deployment gate**: Orchestrators verify delegation targets against this list. Gates verify each entry has a formal approval reference for A3 and above. |
| `governance.escalationContacts` | When an incident occurs, the time to locate the right contact must be seconds, not minutes. The card must carry this, not just a registry that may be unreachable or require separate authentication. | **Provisioning**: SIEM and alerting platforms configure routing from this at setup and **Informational**: consumed directly by humans during incidents. |
| `governance.changeApprovalReference` | Links the deployed version to its approved change record. Without this, there is no way to verify from the card alone that the agent was properly promoted. | **Deployment gate**: Verified as present before production promotion. **Informational** for audit. |
| `governance.modelRisk.modelInventoryId` | Connects this agent to its SR 11-7 validation record. An orchestrator enforcing model risk policy must know whether a valid inventory entry exists. | **Deployment gate**: Must be populated before any production deployment this is the single hardest gate in the schema. **Provisioning**: Monitoring platforms link performance telemetry to the inventory record using this ID. |
| `governance.modelRisk.lastValidationDate` | A stale validation date is a material risk signal that can be read directly from the card, without querying the model inventory. | **Runtime decision** (orchestrators with a maximum validation age policy can decline to delegate) and **Deployment gate** (gates can enforce a minimum validation recency requirement). |
| `governance.modelRisk.nextReviewDate` | Allows monitoring platforms and governance dashboards to track approaching review deadlines without querying the model inventory directly. | **Provisioning**: Monitoring platforms schedule review reminders from this value. **Informational** for governance teams. Not a blocking deployment gate on its own. |
| `dataHandling.dataClassification` | The highest data classification this agent can process. Callers must know this to apply the correct data segregation controls at routing time. | **Runtime decision** and **Deployment gate**: Orchestrators enforce classification-compatible routing. Gates verify consistency with `permittedDataDomains`. |
| `dataHandling.permittedDataDomains` | The definitive list of data domains this agent is  authorized to access. Without this, no system can verify that data being passed to the agent is within its approved scope. | **Runtime decision**: Orchestrators verify domain compatibility before passing data. **Deployment gate**: Gates validate the declared domains are consistent with the data handling approval. **Provisioning**: DLP tools configure scanning rules from this list. |
| `dataHandling.dataResidency.permittedRegions` | Data sovereignty obligations vary by jurisdiction. Infrastructure automation needs the permitted regions at provisioning time; runtime routing may also use it where agents are deployed across multiple regions. | **Provisioning**: Cloud infrastructure and traffic routing systems enforce region placement at setup. **Informational** for compliance review. Runtime enforcement depends on whether your orchestration platform supports region-aware routing. |
| `dataHandling.dataResidency.restrictedRegions` | Explicit prohibitions are as important as permissions. Negative controls must be machine-readable to be enforceable. | **Provisioning** and **Informational**: Used to configure network and data policies at
```

### Review questions

- Which fields are obligations versus illustrations?
- Identify trust-boundary implications.

## G6B1-12

- Evidence ID: `BEV-d075515016509baf01b5c585`
- Repository: `r0light/cna-quality-model`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `pattern-dna-quality-model`
- Architecture group: `ACFG-320ec7fed4f6bcd4d1c63b7f`

### Bounded evidence

```text
Item Title,Publication Title,Book Series Title,Journal Volume,Journal Issue,Item DOI,Authors,Publication Year,URL,Content Type
"Towards Software Compliance Specification and Enforcement Using TOSCA","Economics of Grids, Clouds, Systems, and Services","","","","10.1007/978-3-030-92916-9_14","Mohammed MubarkootJörn Altmann","2021","http://link.springer.com/chapter/10.1007/978-3-030-92916-9_14","Chapter"
"The CMS monitoring infrastructure and applications","Computing and Software for Big Science","","5","1","10.1007/s41781-020-00051-x","Christian Ariza-PorrasValentin KuznetsovFederica Legger","2021","http://link.springer.com/article/10.1007/s41781-020-00051-x","Article"
"The Relation of Test-Related Factors to Software Quality: A Case Study on Apache Systems","Empirical Software Engineering","","26","2","10.1007/s10664-020-09891-y","Fabiano PecorelliFabio PalombaAndrea De Lucia","2021","http://link.springer.com/article/10.1007/s10664-020-09891-y","Article"
"Ultra-Reliable and Low-Latency Computing in the Edge with Kubernetes","Journal of Grid Computing","","19","3","10.1007/s10723-021-09573-z","László Toka","2021","http://link.springer.com/article/10.1007/s10723-021-09573-z","Article"
"Designing and implementing a Big Data benchmark in a financial context: application to a cash management use case","Computing","","103","9","10.1007/s00607-021-00933-x","Lilia SfaxiMohamed Mehdi Ben Aissa","2021","http://link.springer.com/article/10.1007/s00607-021-00933-x","Article"
"Enjoy your observability: an industrial survey of microservice tracing and analysis","Empirical Software Engineering","","27","1","10.1007/s10664-021-10063-9","Bowen LiXin PengQilin XiangHanzhang WangTao XieJun SunXuanzhe Liu","2021","http://link.springer.com/article/10.1007/s10664-021-10063-9","Article"
"A cloud-native application for digital restoration of Cultural Heritage using nuclear imaging: THESPIAN-XRF","Rendiconti Lincei. Scienze Fisiche e Naturali","","","","10.1007/s12210-023-01174-0","Alessandro BombiniFernando García-Avello BofíasChiara RubertoFrancesco Taccetti","2023","http://link.springer.com/article/10.1007/s12210-023-01174-0","Article"
"Edge computing in the loop simulation framework for automotive use cases evaluation","Wireless Networks","","","","10.1007/s11276-023-03432-3","Levente Márk MallerPéter SuskovicsLászló Bokor","2023","http://link.springer.com/article/10.1007/s11276-023-03432-3","Article"
"Snowmass 2021 Computational Frontier CompF4 Topical Group Report Storage and Processing Resource Access","Computing and Software for Big Science","","7","1","10.1007/s41781-023-00097-7","W. BhimjiD. CarderE. DartJ. DuarteI. FiskR. GardnerC. GuokB. JayatilakaT. LehmanM. LinC. MaltzahnS. McKeeM. S. NeubauerO. RindO. ShaduraN. V. Tran","2023","http://link.springer.com/article/10.1007/s41781-023-00097-7","Article"
"Offline Mining of Microservice-Based Architectures (Extended Version)","SN Computer Science","","4","3","10.1007/s42979-023-01721-4","Jacopo SoldaniJavad KhaliliAntonio Brogi","2023","http://link.springer.com/article/10.1007/s42979-023-01721-4","Article"
"Intent-Driven Orchestration: Enforcing Service Level Objectives for Cloud Native Deployments","SN Computer Science","","4","3","10.1007/s42979-023-01698-0","Thijs MetschMagdalena ViktorssonAdrian HobanMonica VitaliRavi IyerErik Elmroth","2023","http://link.springer.com/article/10.1007/s42979-023-01698-0","Article"
"A Novel Weight-Assignment Load Balancing Algorithm for Cloud Applications","SN Computer Science","","4","3","10.1007/s42979-023-01702-7","Adekunbi A. AdewojoJulian M. Bass","2023","http://link.springer.com/article/10.1007/s42979-023-01702-7","Article"
"Minimizing Resource Allocation for Cloud-Native Microservices","Journal of Network and Systems Management","","31","2","10.1007/s10922-023-09726-3","Roland ErdeiLaszlo Toka","2023","http://link.springer.com/article/10.1007/s10922-023-09726-3","Article"
"Understanding the challenges and novel architectural models of multi-cloud native applications – a systematic literature review","Journal of Cloud Computing","","12","1","10.1186/s13677-022-00367-6","Juncal AlonsoLeire Orue-EchevarriaValentina CasolaAna Isabel TorreMaider HuarteEneko OsabaJesus L. Lobo","2023","http://link.springer.com/article/10.1186/s13677-022-00367-6","Article"
"Cloud Transformation","","","","","10.1007/978-3-658-38823-2","Roland FrankGregor SchumacherAndreas Tamm","2023","http://link.springer.com/book/10.1007/978-3-658-38823-2","Book"
"Edge Intelligence","","","","","10.1007/978-3-031-22155-2","Javid TaheriSchahram DustdarAlbert ZomayaShuiguang Deng","2023","http://link.springer.com/book/10.1007/978-3-031-22155-2","Book"
"Artificial Intelligence  Applications  and Innovations. AIAI 2023 IFIP WG 12.5 International Workshops","IFIP Advances in Information and Communication Technology","","","","10.1007/978-3-031-34171-7","Ilias MaglogiannisLazaros IliadisAntonios PapaleonidasIoannis Chochliouros","2023","http://link.springer.com/book/10.1007/978-3-031-34171-7","Book"
"Smart Computing and Communication","Lecture Notes in Computer Science","","","","10.1007/978-3-031-28124-2","Meikang QiuZhihui LuCheng Zhang","2023","http://link.springer.com/book/10.1007/978-3-031-28124-2","Book"
"Advanced Information Systems Engineering","Lecture Notes in Computer Science","","","","10.1007/978-3-031-34560-9","Marta IndulskaIris Reinhartz-BergerCarlos CetinaOscar Pastor","2023","http://link.springer.com/book/10.1007/978-3-031-34560-9","Book"
"The Digital Twin","","","","","10.1007/978-3-031-21343-4","Noel CrespiAdam T. DrobotRoberto Minerva","2023","http://link.springer.com/book/10.1007/978-3-031-21343-4","Book"
"Computer Science and Education","Communications in Computer and Information Science","","","","10.1007/978-981-99-2449-3","Wenxing HongYang Weng","2023","http://link.springer.com/book/10.1007/978-981-99-2449-3","Book"
"Computer Security. ESORICS 2022 International Workshops","Lecture Notes in Computer Science","","","","10.1007/978-3-031-25460-4","Sokratis KatsikasFrédéric CuppensChristos KalloniatisJohn MylopoulosFrank PallasJörg PohleM. Angela SasseHabtamu AbieSilvio RaniseLuca VerderameEnrico CambiasoJorge Maestre VidalMarco Antonio Sotelo MongeMassimiliano AlbaneseBasel KattSandeep PirbhulalAnkur Shukla","2023","http://link.springer.com/book/10.1007/978-3-031-25460-4","Book"
"European Language Grid","Cognitive Technologies","","","","10.1007/978-3-031-17258-8","Georg Rehm","2023","http://link.springer.com/book/10.1007/978-3-031-17258-8","Book"
"The Power of Data: Driving Climate Change with Data Science and Artificial Intelligence Innovations","Studies in Big Data","","","","10.1007/978-3-031-22456-0","Aboul Ella HassanienAshraf Darwish","2023","http://link.springer.com/book/10.1007/978-3-031-22456-0","Book"
"Ubiquitous Security","Communications in Computer and Information Science","","","","10.1007/978-981-99-0272-9","Guojun WangKim-Kwang Raymond ChooJie WuErnesto Damiani","2023","http://link.springer.com/book/10.1007/978-981-99-0272-9","Book"
"AI and Blockchain in Healthcare","Advanced Technologies and Societal Change","","","","10.1007/978-981-99-0377-1","Bipin Kumar RaiGautam KumarVipin Balyan","2023","http://link.springer.com/book/10.1007/978-981-99-0377-1","Book"
"Parallel and Distributed Computing, Applications and Technologies","Lecture Notes in Computer Science","","","","10.1007/978-3-031-29927-8","Hiroyuki TakizawaHong ShenToshihiro HanawaJong Hyuk ParkHui TianRyusuke Egawa","2023","http://link.springer.com/book/10.1007/978-3-031-29927-8","Book"
"Construction Practice of Cloud Billing Message Based on Stream Native","Smart Computing and Communication","","","","10.1007/978-3-031-28124-2_40","Xiaoli HuangAndi LiuYizhong LiuLi LiZhenglin LvFan Wang","2023","http://link.springer.com/chapter/10.1007/978-3-031-28124-2_40","Chapter"
"Cloud Computing Technology","","","","","10.1007/978-981-19-3026-3","Huawei Technologies Co., Ltd.","2023","http://link.springer.com/book/10.1007/978-981-1
```

### Review questions

- Which quality relationships are machine-readable observations?
- Which causal links remain hypotheses?

## G6B1-13

- Evidence ID: `BEV-577cee3a91825ff936c52564`
- Repository: `r0light/cna-quality-model`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `cross-file-pattern-dna`
- Architecture group: `ACFG-320ec7fed4f6bcd4d1c63b7f`

### Bounded evidence

```text
Item Title,Publication Title,Book Series Title,Journal Volume,Journal Issue,Item DOI,Authors,Publication Year,URL,Content Type
Big Data in Bioeconomy,,,,,10.1007/978-3-030-71069-9,Prof. Caj SödergårdTomas MildorfEphrem HabyarimanaDr. Arne J. BerreDr. Jose A. FernandesDr. Christian Zinke-Wehlmann,2021,http://link.springer.com/book/10.1007/978-3-030-71069-9,Book
Industry practices and challenges for the evolvability assurance of microservices,Empirical Software Engineering,,26,5,10.1007/s10664-021-09999-9,Justus BognerJonas FritzschStefan WagnerAlfred Zimmermann,2021,http://link.springer.com/article/10.1007/s10664-021-09999-9,Article
Towards Software Compliance Specification and Enforcement Using TOSCA,"Economics of Grids, Clouds, Systems, and Services",,,,10.1007/978-3-030-92916-9_14,Mohammed MubarkootJörn Altmann,2021,http://link.springer.com/chapter/10.1007/978-3-030-92916-9_14,Chapter
The CMS monitoring infrastructure and applications,Computing and Software for Big Science,,5,1,10.1007/s41781-020-00051-x,Christian Ariza-PorrasValentin KuznetsovFederica Legger,2021,http://link.springer.com/article/10.1007/s41781-020-00051-x,Article
The Relation of Test-Related Factors to Software Quality: A Case Study on Apache Systems,Empirical Software Engineering,,26,2,10.1007/s10664-020-09891-y,Fabiano PecorelliFabio PalombaAndrea De Lucia,2021,http://link.springer.com/article/10.1007/s10664-020-09891-y,Article
Ultra-Reliable and Low-Latency Computing in the Edge with Kubernetes,Journal of Grid Computing,,19,3,10.1007/s10723-021-09573-z,László Toka,2021,http://link.springer.com/article/10.1007/s10723-021-09573-z,Article
Designing and implementing a Big Data benchmark in a financial context: application to a cash management use case,Computing,,103,9,10.1007/s00607-021-00933-x,Lilia SfaxiMohamed Mehdi Ben Aissa,2021,http://link.springer.com/article/10.1007/s00607-021-00933-x,Article
Enjoy your observability: an industrial survey of microservice tracing and analysis,Empirical Software Engineering,,27,1,10.1007/s10664-021-10063-9,Bowen LiXin PengQilin XiangHanzhang WangTao XieJun SunXuanzhe Liu,2021,http://link.springer.com/article/10.1007/s10664-021-10063-9,Article
A novel distributed Social Internet of Things service recommendation scheme based on LSH forest,Personal and Ubiquitous Computing,,25,6,10.1007/s00779-019-01283-4,Biwei YanJiguo YuMeihong YangHonglu JiangZhiguo WanLina Ni,2021,http://link.springer.com/article/10.1007/s00779-019-01283-4,Article
Mining and relating design contexts and design patterns from Stack Overflow,Empirical Software Engineering,,27,1,10.1007/s10664-021-10034-0,Laksri WijerathnaAldeida AletiTingting BiAntony Tang,2021,http://link.springer.com/article/10.1007/s10664-021-10034-0,Article
Industry practices and challenges for the evolvability assurance of microservices,Empirical Software Engineering,,26,5,10.1007/s10664-021-09999-9,Justus BognerJonas FritzschStefan WagnerAlfred Zimmermann,2021,http://link.springer.com/article/10.1007/s10664-021-09999-9,Article
Evaluation of SOA-Based Web Services and Microservices Architecture Using Complexity Metrics,SN Computer Science,,2,5,10.1007/s42979-021-00767-6,Vinay RajRavichandra Sadam,2021,http://link.springer.com/article/10.1007/s42979-021-00767-6,Article
Transformation-based processing of typed resources for multimedia sources in the IoT environment,Wireless Networks,,27,5,10.1007/s11276-019-02200-6,Honghao GaoYucong DuanLixu ShaoXiaobing Sun,2021,http://link.springer.com/article/10.1007/s11276-019-02200-6,Article
A hierarchical model for quantifying software security based on static analysis alerts and software metrics,Software Quality Journal,,29,2,10.1007/s11219-021-09555-0,Miltiadis SiavvasDionysios KehagiasDimitrios TzovarasErol Gelenbe,2021,http://link.springer.com/article/10.1007/s11219-021-09555-0,Article
Service-oriented replication strategies for improving quality-of-service in cloud computing: a survey,Cluster Computing,,24,1,10.1007/s10586-020-03108-z,Sarra SlimaniTarek HamrouniFaouzi Ben Charrada,2021,http://link.springer.com/article/10.1007/s10586-020-03108-z,Article
Automated Analysis of Distributed Tracing: Challenges and Research Directions,Journal of Grid Computing,,19,1,10.1007/s10723-021-09551-5,Andre BentoJaime CorreiaRicardo FilipeFilipe AraujoJorge Cardoso,2021,http://link.springer.com/article/10.1007/s10723-021-09551-5,Article
Multi-agent architecture for fault recovery in self-healing systems,Journal of Ambient Intelligence and Humanized Computing,,12,2,10.1007/s12652-020-02443-8,Pushpendra Kumar RajputGeeta Sikka,2021,http://link.springer.com/article/10.1007/s12652-020-02443-8,Article
Service-Oriented Computing,Lecture Notes in Computer Science,,,,10.1007/978-3-030-91431-8,Hakim HacidOdej KaoMassimo MecellaDr. Naouel MohaHye-young Paik,2021,http://link.springer.com/book/10.1007/978-3-030-91431-8,Book
Service-Oriented Computing  – ICSOC 2020 Workshops,Lecture Notes in Computer Science,,,,10.1007/978-3-030-76352-7,Hakim HacidFatma OutayHye-young PaikAmira AlloumMarinella PetrocchiMohamed Reda BouadjenekDr. Amin BeheshtiXumin LiuAbderrahmane Maaradji,2021,http://link.springer.com/book/10.1007/978-3-030-76352-7,Book
Service-Oriented Computing,Communications in Computer and Information Science,,,,10.1007/978-3-030-87568-8,Johanna Barzen,2021,http://link.springer.com/book/10.1007/978-3-030-87568-8,Book
Software Architecture,Lecture Notes in Computer Science,,,,10.1007/978-3-030-86044-8,Univ.-Prof. Dr. Stefan BifflElena NavarroWelf LöweProf. Marjan SirjaniProf. Raffaela MirandolaProf. Dr. Danny Weyns,2021,http://link.springer.com/book/10.1007/978-3-030-86044-8,Book
Advanced Information Systems Engineering,Lecture Notes in Computer Science,,,,10.1007/978-3-030-79382-1,Marcello La RosaShazia SadiqProf. Ernest Teniente,2021,http://link.springer.com/book/10.1007/978-3-030-79382-1,Book
Computational Science and Its Applications – ICCSA 2021,Lecture Notes in Computer Science,,,,10.1007/978-3-030-86970-0,Prof. Dr. Osvaldo GervasiBeniamino MurganteDr. Sanjay MisraDr. Chiara GarauIvan BlečićDavid TaniarBernady O. ApduhanAna Maria A. C. RochaEufemia TarantinoCarmelo Maria Torre,2021,http://link.springer.com/book/10.1007/978-3-030-86970-0,Book
Quality of Information and Communications Technology,Communications in Computer and Information Science,,,,10.1007/978-3-030-85347-1,Prof. Ana C. R. PaivaAna Rosa CavalliPaula Ventura MartinsRicardo Pérez-Castillo,2021,http://link.springer.com/book/10.1007/978-3-030-85347-1,Book
Web Engineering,Lecture Notes in Computer Science,,,,10.1007/978-3-030-74296-6,Ph.D. Marco BrambillaProf. Richard ChbeirFlavius FrasincarDr. Ioana Manolescu,2021,http://link.springer.com/book/10.1007/978-3-030-74296-6,Book
Smart and Sustainable Collaborative Networks 4.0,IFIP Advances in Information and Communication Technology,,,,10.1007/978-3-030-85969-5,Prof. Dr. Luis M. Camarinha-MatosProf. Dr. Xavier BoucherProf. Dr. Hamideh Afsarmanesh,2021,http://link.springer.com/book/10.1007/978-3-030-85969-5,Book
Business Modeling and Software Design,Lecture Notes in Business Information Processing,,,,10.1007/978-3-030-79976-2,Dr. Boris Shishkov,2021,http://link.springer.com/book/10.1007/978-3-030-79976-2,Book
Information and Software Technologies,Communications in Computer and Information Science,,,,10.1007/978-3-030-88304-1,Audrius LopataDaina GudonienėRita Butkienė,2021,http://link.springer.com/book/10.1007/978-3-030-88304-1,Book
Innovation Through Information Systems,Lecture Notes in Information Systems and Organisation,,,,10.1007/978-3-030-86800-0,Prof. Dr. Frederik AhlemannProf. Dr. Reinhard SchütteProf. Dr. Stefan Stieglitz,2021,http://link.springer.com/book/10.1007/978-3-030-86800-0,Book
Computational Science and Its Applications – ICCSA 2021,Lecture Notes in Computer Science,,,,10.1007/978-3-030-87007-2,Prof. Dr. Osvaldo GervasiBeniamino MurganteDr. Sanjay MisraDr. Chiara GarauIvan BlečićDavid TaniarBernady O. ApduhanAna Maria A. C. RochaEufemia TarantinoCarmelo Mari
```

### Review questions

- How does this unit relate to its architecture group?
- Which fields require cross-file evidence?

## G6B1-14

- Evidence ID: `BEV-0a57ca89afc9e92ec29c8871`
- Repository: `service-mesh-patterns/service-mesh-patterns`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `resilience-source-example`
- Architecture group: `ACFG-c57bafb060de8b4690ae8781`

### Bounded evidence

```text
name: BookInfo with Circuit Breaker
services:
  bookinfo-vs:
    type: VirtualService.Istio
    namespace: default
    settings:
      gateways:
      - sample-app-gateway
      hosts:
      - bookinfo.meshery.io
      http:
      - match:
        - uri:
            exact: /productpage
        - uri:
            prefix: /static
        - uri:
            exact: /login
        - uri:
            exact: /logout
        - uri:
            prefix: /api/v1/products
        route:
        - destination:
            host: productpage
            port:
              number: 9080
      name: bookinfo-vsc
      namespace: default
    traits:
      meshmap:
        edges:
        - from: $(#ref.services.sample-app-gateway.id)
          to: $(#ref.services.bookinfo-vs.id)
        - from: $(#ref.services.bookinfo-vs.id)
          to: $(#ref.services.circuit-breaker.id)
        position:
          posX: 183.00511692929953
          posY: 320.00211735005496
  circuit-breaker:
```

### Review questions

- Which resilience behaviour is demonstrated?
- What is not guaranteed by the example?

## G6B1-15

- Evidence ID: `BEV-b4d881c0aa0d205179a5c445`
- Repository: `spring-projects/spring-modulith`
- Source authority: `architecture-conformance-implementation`
- Category under review: `implementation-observation`
- Architecture group: `ACFG-579a3b1739d9a8d917fe3dcb`

### Bounded evidence

```text
While `@Modulithic` allows defining `additionalPackages` to trigger application module detection for packages other than the one of the annotated class, its usage requires knowing about those in advance.
As of version 1.3, Spring Modulith supports external contributions of application modules via the `ApplicationModuleSource` and `ApplicationModuleSourceFactory` abstractions.
An implementation of the latter can be registered in a `spring.factories` file located in `META-INF`.

[source, text]
----
org.springframework.modulith.core.ApplicationModuleSourceFactory=example.CustomApplicationModuleSourceFactory
----

Such a factory can either return arbitrary package names to get an `ApplicationModuleDetectionStrategy` applied, or explicitly return packages to create modules for.

[source, java]
----
package example;

public class CustomApplicationModuleSourceFactory implements ApplicationModuleSourceFactory {

	@Override
	public List<String> getRootPackages() {
		return List.of("com.acme.toscan");
	}

	@Override
	public ApplicationModuleDetectionStrategy getApplicationModuleDetectionStrategy() {
		return ApplicationModuleDetectionStrategy.explicitlyAnnotated();
	}

	@Override
	public List<String> getModuleBasePackages() {
		return List.of("com.acme.module");
	}
}
----

The above example would use `com.acme.toscan` to detect xref:fundamentals.adoc#customizing-modules[explicitly declared modules] within that and also create an application module from `com.acme.module`.
The package names returned from these will subsequently be translated into ``ApplicationModuleSource``s via the corresponding `getApplicationModuleSource(…)` flavors exposed in `ApplicationModuleDetectionStrategy`.

[[customizing-named-interfaces]]
```

### Review questions

- Which module structure is observable?
- Can it support a recommendation without other evidence?

## G6B1-16

- Evidence ID: `BEV-b3e3c943daf7709f0853caae`
- Repository: `open-telemetry/opentelemetry-demo`
- Source authority: `official-reference-architecture`
- Category under review: `observability`
- Architecture group: `ACFG-0950a50270cc1818742c5a93`

### Bounded evidence

```text
<.flash kind={:info} flash={@flash} />
      <.flash kind={:info} phx-mounted={show("#flash")}>Welcome Back!</.flash>
  """
  attr :id, :string, doc: "the optional id of flash container"
  attr :flash, :map, default: %{}, doc: "the map of flash messages to display"
  attr :title, :string, default: nil
  attr :kind, :atom, values: [:info, :error], doc: "used for styling and flash lookup"
  attr :rest, :global, doc: "the arbitrary HTML attributes to add to the flash container"

  slot :inner_block, doc: "the optional inner block that renders the flash message"

  def flash(assigns) do
    assigns = assign_new(assigns, :id, fn -> "flash-#{assigns.kind}" end)

    ~H"""
    <div
      :if={msg = render_slot(@inner_block) || Phoenix.Flash.get(@flash, @kind)}
      id={@id}
      phx-click={JS.push("lv:clear-flash", value: %{key: @kind}) |> hide("##{@id}")}
      role="alert"
      class="toast toast-top toast-end z-50"
      {@rest}
    >
      <div class={[
        "alert w-80 sm:w-96 max-w-80 sm:max-w-96 text-wrap",
        @kind == :info && "alert-info",
        @kind == :error && "alert-error"
      ]}>
        <.icon :if={@kind == :info} name="hero-information-circle-mini" class="size-5 shrink-0" />
        <.icon :if={@kind == :error} name="hero-exclamation-circle-mini" class="size-5 shrink-0" />
        <div>
          <p :if={@title} class="font-semibold">{@title}</p>
          <p>{msg}</p>
        </div>
        <div class="flex-1" />
        <button type="button" class="group self-start cursor-pointer" aria-label={gettext("close")}>
          <.icon name="hero-x-mark-solid" class="size-5 opacity-40 group-hover:opacity-70" />
        </button>
      </div>
```

### Review questions

- Which telemetry relationships are explicit?
- What official-specification gaps remain?

## G6B1-17

- Evidence ID: `BEV-f6949d67d67d9d38262c6311`
- Repository: `plantuml-stdlib/C4-PlantUML`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `diagram-semantics`
- Architecture group: `ACFG-b6a569e943298305528c6772`

### Bounded evidence

```text
!theme sandstone

!$THEME = "C4_sandstone"

!$ELEMENT_FONT_COLOR ?= $PRIMARY_TEXT

!$ARROW_COLOR ?= $PRIMARY_LIGHT
!$ARROW_FONT_COLOR ?= $ARROW_COLOR

!$PERSON_FONT_COLOR ?= $INFO_TEXT
!$PERSON_BG_COLOR ?= $INFO
!$PERSON_BORDER_COLOR ?= $INFO_DARK

!$EXTERNAL_PERSON_FONT_COLOR ?= $INFO_DARK
!$EXTERNAL_PERSON_BG_COLOR ?= $LIGHT
!$EXTERNAL_PERSON_BORDER_COLOR ?= $INFO_DARK

!$SYSTEM_FONT_COLOR ?= $WHITE
!$SYSTEM_BG_COLOR ?= $DARK
!$SYSTEM_BORDER_COLOR ?= $DARK_DARK

!$EXTERNAL_SYSTEM_FONT_COLOR ?= $DARK_DARK
!$EXTERNAL_SYSTEM_BG_COLOR ?= $LIGHT
!$EXTERNAL_SYSTEM_BORDER_COLOR ?= $DARK_DARK

!$CONTAINER_FONT_COLOR ?= $WARNING_TEXT
!$CONTAINER_BG_COLOR ?= $WARNING
!$CONTAINER_BORDER_COLOR ?= $WARNING_DARK

!$EXTERNAL_CONTAINER_FONT_COLOR ?= $WARNING_DARK
!$EXTERNAL_CONTAINER_BG_COLOR ?= $LIGHT
!$EXTERNAL_CONTAINER_BORDER_COLOR ?= $WARNING_DARK

!$COMPONENT_FONT_COLOR ?= $PRIMARY_TEXT
!$COMPONENT_BG_COLOR ?= $PRIMARY
!$COMPONENT_BORDER_COLOR ?= $PRIMARY_DARK

!$EXTERNAL_COMPONENT_FONT_COLOR ?= $PRIMARY_DARK
!$EXTERNAL_COMPONENT_BG_COLOR ?= $LIGHT
!$EXTERNAL_COMPONENT_BORDER_COLOR ?= $PRIMARY_DARK
```

### Review questions

- Which model elements and relations are explicit?
- Which semantics require a specialist parser?

## G6B1-18

- Evidence ID: `BEV-235d9f247ef339a20866b297`
- Repository: `plantuml-stdlib/C4-PlantUML`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `diagram-non-claim-control`
- Architecture group: `ACFG-b6a569e943298305528c6772`

### Bounded evidence

```text
' all available language specific text labels (orig. English)
!$THEME = "C4Language_danish"

!$BOUNDARY_LEGEND_TEXT ?= "skillelinje"

!$LEGEND_TITLE_TEXT ?= "Signaturforklaring"

!$LEGEND_BOUNDARY ?= "skillelinje"
' !$LEGEND_BOUNDARY_PRE_PART ?= ""
' !$LEGEND_BOUNDARY_POST_PART ?= " " + $LEGEND_BOUNDARY

!$LEGEND_SHADOW_TEXT ?= "skygge"
!$LEGEND_NO_SHADOW_TEXT ?= "ingen skygge"
!$LEGEND_NO_FONT_BG_TEXT ?= "sidste tekst og sidste farve"
!$LEGEND_NO_FONT_TEXT ?= "sidste tekstfarve"
!$LEGEND_NO_BG_TEXT ?= "sidste baggrundsfarve"
!$LEGEND_NO_LINE_TEXT ?= "sidste linjefarve"
!$LEGEND_SHARP_CORNER ?= "boks"
!$LEGEND_ROUNDED_BOX ?= "rundet boks"
!$LEGEND_EIGHT_SIDED ?= "ottesidet"
!$LEGEND_DOTTED_LINE ?= "prikket"
!$LEGEND_DASHED_LINE ?= "stiplet"
!$LEGEND_BOLD_LINE ?= "fed"
!$LEGEND_SOLID_LINE ?= "solid"
' !$LEGEND_BOUNDARY_TRANSPARENT_INCL_COMA ?= "transparent, "
!$LEGEND_BOUNDARY_TRANSPARENT_INCL_COMA ?= ""
!$LEGEND_BOUNDARY_DASHED_INCL_COMA ?= "stiplet, "
' !$LEGEND_BOUNDARY_DASHED_INCL_COMA ?= ""
!$LEGEND_THICKNESS ?= "tykkelse"
!$SKETCH_FOOTER_WARNING ?= "Advarsel:"
!$SKETCH_FOOTER_TEXT ?= "Oprettet til diskussion, skal valideres"

!$COMPONENT_LEGEND_TEXT ?= "komponent"
!$EXTERNAL_COMPONENT_LEGEND_TEXT ?= "ekstern komponent"

!$CONTAINER_LEGEND_TEXT ?= "container"
!$CONTAINER_BOUNDARY_TYPE ?= "container"
!$CONTAINER_BOUNDARY_LEGEND_TEXT ?= "container skillelinje"
!$EXTERNAL_CONTAINER_LEGEND_TEXT ?= "ekstern container"
```

### Review questions

- Does this paired model content carry an architectural proposition?
- Which provenance must be retained if treated as a non-claim?

## G6B1-19

- Evidence ID: `BEV-6bfde0a7dbe3beb487385bfe`
- Repository: `likec4/likec4`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `cross-file-reasoning`
- Architecture group: `ACFG-58fd77bf049118571a073ea0`

### Bounded evidence

```text
/**
 * Shared test helpers for DrawIO export/import specs (DRY between drawio-tutorial and drawio-demo).
 */

import { getAllDiagrams } from '@likec4/generators'
import { expect } from 'vitest'

/** Regex: nested <Array><Array> inside mxGeometry (invalid in draw.io; causes "Could not add object Array"). */
const NESTED_ARRAY_IN_GEOMETRY = /<mxGeometry[\s\S]*?<Array>\s*<Array>/
/** Regex: single <Array> of <mxPoint> for edge geometry (valid structure). */
const EDGE_GEOMETRY_SINGLE_ARRAY = /<mxGeometry[\s\S]*?<Array(\s[^>]*)?>[\s\S]*?<mxPoint[\s\S]*?<\/Array>/
const VERTEX_CELL_PATTERN = /<mxCell[^>]*\svertex="1"/gi
const EDGE_CELL_PATTERN = /<mxCell[^>]*\sedge="1"/gi

/**
 * Asserts that the DrawIO XML does not contain the structure that causes
 * "Could not add object Array" in draw.io. Draw.io expects a single <Array>
 * of <mxPoint> inside mxGeometry for edge waypoints; nested <Array><Array> is invalid.
 */
export function expectDrawioXmlLoadableInDrawio(drawioXml: string): void {
  const diagrams = getAllDiagrams(drawioXml)
  for (const d of diagrams) {
    const content = d.content
    expect(
      content,
      'Diagram must not contain nested <Array><Array> (causes "Could not add object Array" in draw.io)',
    ).not.toMatch(NESTED_ARRAY_IN_GEOMETRY)
    if (content.includes('as="sourcePoint"') || content.includes('as="targetPoint"')) {
      expect(
        content,
        'Edge geometry with points must use single <Array> (or <Array as="points">) of <mxPoint>, not nested Array',
      ).toMatch(EDGE_GEOMETRY_SINGLE_ARRAY)
    }
  }
}

/** Count vertex and edge mxCells in decompressed diagram content */
export function countDrawioCells(content: string): { vertices: number; edges: number } {
  const vertices = (content.match(VERTEX_CELL_PATTERN) ?? []).length
  const edges = (content.match(EDGE_CELL_PATTERN) ?? []).length
```

### Review questions

- What is supported by this unit alone?
- What must be deferred to its architecture group?

## G6B1-20

- Evidence ID: `BEV-525e8c7d02b86716e6ddfd0b`
- Repository: `aws-samples/serverless-patterns`
- Source authority: `official-reference-architecture`
- Category under review: `duplicate-reuse`
- Architecture group: `ACFG-23eb75225ae1ca6696aec6a3`

### Bounded evidence

```text
1. Create a new directory, navigate to that directory in a terminal and clone the GitHub repository:
    ```
    git clone https://github.com/aws-samples/serverless-patterns
    ```
2. Change directory to the pattern directory:
    ```
    cd systems-manager-automation-to-lambda
    ```
3. From the command line, use AWS SAM to deploy the AWS resources for the pattern as specified in the template.yml file:
    ```
    sam deploy --guided --capabilities CAPABILITY_NAMED_IAM
    ```
4. During the prompts:
    * Enter a stack name
    * Enter the desired AWS Region
    * Allow SAM CLI to create IAM roles with the required permissions.

    Once you have run `sam deploy --guided --capabilities CAPABILITY_NAMED_IAM` mode once and saved arguments to a configuration file (samconfig.toml), you can use `sam deploy` in future to use these defaults.

5. Note the following output Values from the SAM deployment process. These contain the resource names and/or ARNs which are used for testing.

    * ```
      DynamoDBTableName
      ```

    * ```
      SystemsManagerAutomationDocumentName
      ```
```

### Review questions

- Is this content semantically reusable across occurrences?
- What provenance must remain individual?

## G6B1-21

- Evidence ID: `BEV-fcc349fa2dedc2c092f08f84`
- Repository: `ea-toolkit/architecture-catalog`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `deliberate-non-claim`
- Architecture group: `none`

### Bounded evidence

```text
The catalog UI design is inspired by [EventCatalog](https://www.eventcatalog.dev/)
by David Boyne. EventCatalog is an excellent tool for documenting event-driven
architectures — if that's your focus, check it out.

Architecture Catalog takes a different approach: vocabulary-agnostic,
schema-driven, and built for enterprise architecture modelling across
all layers (not just events).
```

### Review questions

- Does this passage contain any architectural proposition?
- Should the system reject or abstain?

## G6B1-22

- Evidence ID: `BEV-51f4caabb87d02521ee53e84`
- Repository: `ardalis/CleanArchitecture`
- Source authority: `reviewed-practitioner-or-implementation-source`
- Category under review: `modernisation`
- Architecture group: `ACFG-0c156fab5d4b30270abb18d8`

### Bounded evidence

```text
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Clean.Architecture.Infrastructure.Data.Migrations;

/// <inheritdoc />
public partial class UseDbGeneratedIds : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
        {
            // SQL Server requires drop/recreate to add IDENTITY to an existing column.
            // Rename the old table, recreate with IDENTITY, copy data, then drop old.
            migrationBuilder.Sql("EXEC sp_rename N'[Contributors]', N'[Contributors_old]'");
            migrationBuilder.Sql("EXEC sp_rename N'[Contributors_old].[PK_Contributors]', N'PK_Contributors_old', N'INDEX'");

            migrationBuilder.CreateTable(
                name: "Contributors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PhoneNumber_CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber_Number = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber_Extension = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contributors", x => x.Id);
                });

            migrationBuilder.Sql(
                "SET IDENTITY_INSERT [Contributors] ON;" +
                "INSERT INTO [Contributors] ([Id],[Name],[Status],[PhoneNumber_CountryCode],[PhoneNumber_Number],[PhoneNumber_Extension]) " +
                "SELECT [Id],[Name],[Status],[PhoneNumber_CountryCode],[PhoneNumber_Number],[PhoneNumber_Extension] FROM [Contributors_old];" +
```

### Review questions

- Which migration structure is observed?
- Which target-state recommendation needs more evidence?

## G6B1-23

- Evidence ID: `BEV-7cb026af13f9061c688c165f`
- Repository: `TNG/ArchUnit`
- Source authority: `architecture-conformance-implementation`
- Category under review: `conformance-implementation`
- Architecture group: `ACFG-42527522533d560a45d0a46a`

### Bounded evidence

```text
[NOTE]
Note: ArchUnit doesn't strive to be a "competition" for module systems like the
Java Platform Module System. Such systems have advantages like checks at compile time
versus test time as ArchUnit does. So, if another module system works well in your
environment, there is no need to switch over. But ArchUnit can bring JPMS-like features
to older code bases, e.g. Java 8 projects, or environments where the JPMS is for some
reason no option. It also can accompany a module system by adding additional rules e.g.
on the API of a module.

To express the concept of modularization ArchUnit offers `ArchModule`﻿s. The entrypoint into
the API is `ModuleRuleDefinition`, e.g.

[source,java,options="nowrap"]
----
ModuleRuleDefinition.modules().definedByPackages("..example.(*)..").should().beFreeOfCycles();
----

As the example shows, it shares some concepts with the <<Slices>> API. For example `definedByPackages(..)`
follows the same semantics as `slices().matching(..)`.
Also, the configuration options for cycle detection mentioned in the last section are shared by these APIs.
But, it also offers several powerful concepts beyond that API to express many different modularization scenarios.

One example would be to express modules via annotation. We can introduce a custom annotation
like `@AppModule` and follow a convention to annotate the top-level `package-info` file
of each package we consider the root of a module. E.g.

[source,java,options="nowrap"]
.com/myapp/example/module_one/package-info.java
----
@AppModule(
  name = "Module One",
  allowedDependencies = {"Module Two", "Module Three"},
  exposedPackages = {"..module_one.api.."}
)
package com.myapp.example.module_one;
----

We can then define a rule using this annotation:
```

### Review questions

- Which modularity rules are implemented?
- Which rule can be treated as normative, if any?

## G6B1-24

- Evidence ID: `none`
- Repository: `fauzisho/awesome-antipattern`
- Source authority: `educational-or-discovery-source`
- Category under review: `insufficient-evidence-and-abstention`
- Architecture group: `none`

### Bounded evidence

```text
[No governed bounded evidence is available for this control.]
```

### Review questions

- No second governed passage is available. Must the system abstain?
- What evidence is missing?
