# Gate 6B.2 diagnostic review pack

Diagnostic fingerprint: `sha256:d6a9bdaaa702ceea8d5eecd2077f90b3e6095f00fd6196bcbfc5760aa9c1b31a`
Model answers: none
Production accepted: false

## G6B1-01

- Evidence ID: `BEV-f4e684d09a9fb9f2589375ce`
- Repository: `Azure/ResourceModules`
- Commit: `0342b24f9439a62a349ad90f4258b3304b4523d9`
- Path: `docs/wiki/Solution creation.md`
- Excerpt hash: `sha256:825952e6114e95ce2b100f6cace95334855b0e37dbe4497bd55cc20b12a892ff`

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

## G6B1-02

- Evidence ID: `BEV-53bc04b94c6a9116788e7543`
- Repository: `Azure/ResourceModules`
- Commit: `0342b24f9439a62a349ad90f4258b3304b4523d9`
- Path: `docs/wiki/The library - Module design.md`
- Excerpt hash: `sha256:a0f65cf4feb71a76aedead58a51cb8658be1b93a51f26ade1f430b4ba286cdfa`

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

## G6B1-05

- Evidence ID: `BEV-0053bcdba65df5d1e58fdbf4`
- Repository: `oam-dev/spec`
- Commit: `a64696e70e24bd4d0ad26705c8338c51a19f5163`
- Path: `8.practical_considerations.md`
- Excerpt hash: `sha256:a56539f2949f91f3b7e4a93b5964bf906c019903527cf932d8e7e2043d86b7f3`

This model, in its current form, does not mandate a specific set of security policies. However, it does provide guidance on certain aspects of security:

- OCI/Docker images MUST be referenced by SHA wherever possible
- File formats MUST be converted to a canonical format so that they can be hashed

When these two conditions are satisfied, systems can be constructed in which a digest verification of schematics will preserve the immutability of all components of the system. To wit, if a schematic references an image with a hash, then the process to verify the digest of the schematic also ensures that the image pulled has the same reference used to generate the schematic.

Other security details, such as network transport security or securing data at rest, are considered beyond the scope of this model.

| Previous      | Next        |
| ------------- |-------------|
| [7. Application Configuration](7.application.md)  | [9. Design Principles](9.design_principles.md) |

## G6B1-06

- Evidence ID: `BEV-79d04db6eab52cfde71559fc`
- Repository: `MicrosoftDocs/architecture-center`
- Commit: `caf11b78405e42dfe52f887c5188e18cab003da5`
- Path: `docs/reference-architectures/n-tier/linux-vm-content.md`
- Excerpt hash: `sha256:3ba737d6bdb2468fb1dab3def62ec873e287d7d8ee5825d6cff05d1f89f412c4`

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

## G6B1-07

- Evidence ID: `BEV-48b0cb0824957d14e5044e65`
- Repository: `MicrosoftDocs/architecture-center`
- Commit: `caf11b78405e42dfe52f887c5188e18cab003da5`
- Path: `docs/reference-architectures/n-tier/windows-vm-content.md`
- Excerpt hash: `sha256:816f837ed39ff54faacc23a3cfef9ba4ae53e71869bd4b6888485e61de1368b4`

Performance Efficiency refers to your workload's ability to scale to meet user demands efficiently. For more information, see [Design review checklist for Performance Efficiency](/azure/well-architected/performance-efficiency/checklist).

Performance Efficiency helps you minimize latency, achieve scalable architectures, optimize resource utilization, and continuously improve system performance. The decisions that you make regarding workload architecture, VM size, and disk configurations can greatly affect your workload performance. Making the right choices can prevent the need to rearchitect the solution in the future, add flexibility, and save costs.

Consider these points when you develop your architecture:

- Use virtual machine scale sets if the workload has a dynamic load. For example, scale out during times of high traffic and then scale back in when traffic drops. This approach ensures adequate processing power while still keeping costs under control.

- Choose the appropriate VM and disk SKUs to meet required IOPS during processing. Configure caching to further improve performance.

- If your workload is unusually latency-sensitive, use [proximity placement groups (PPGs)](/azure/virtual-machines/co-location) to ensure that multiple VMs are located physically close to each other to achieve better performance. You can also combine PPGs with availability sets to achieve low latency and high availability within a single physical datacenter.

- Where possible, enable accelerated networking to minimize latency between components.

- Design network architecture to minimize unnecessary hops.

- Use Azure Monitor and other tools to continuously analyze metrics and create updated performance baselines. Use the performance information to determine where to implement changes, and then test against those baselines.

## G6B1-09

- Evidence ID: `BEV-d04770a7fd02a158b96b119d`
- Repository: `MicrosoftDocs/architecture-center`
- Commit: `caf11b78405e42dfe52f887c5188e18cab003da5`
- Path: `docs/guide/architecture-styles/event-driven.md`
- Excerpt hash: `sha256:06ff651397e863b6d1ce44a06093c1625187e330af2976d800c16c81e8763ac1`

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

## G6B1-15

- Evidence ID: `BEV-b4d881c0aa0d205179a5c445`
- Repository: `spring-projects/spring-modulith`
- Commit: `c4f6d51365bdb7f943327392a9cd4e828a58af0f`
- Path: `src/docs/antora/modules/ROOT/pages/fundamentals.adoc`
- Excerpt hash: `sha256:5015625f0b026e5db518fab13eff713c3bf7839c640f4313ee144ed2b843582f`

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
The package names returned from these will subsequently be translated into ``ApplicationModuleSource``s via the corresponding `getApplicationModuleSource(â€¦)` flavors exposed in `ApplicationModuleDetectionStrategy`.

[[customizing-named-interfaces]]

## G6B1-21

- Evidence ID: `BEV-fcc349fa2dedc2c092f08f84`
- Repository: `ea-toolkit/architecture-catalog`
- Commit: `1efa7ea08a8139dc07bcef1834d6964b5fcfd1dc`
- Path: `README.md`
- Excerpt hash: `sha256:d9726e76824270faa3e2a6fbe67494033bae08b4923cc80e75ad21a4351ff0ff`

The catalog UI design is inspired by [EventCatalog](https://www.eventcatalog.dev/)
by David Boyne. EventCatalog is an excellent tool for documenting event-driven
architectures â€” if that's your focus, check it out.

Architecture Catalog takes a different approach: vocabulary-agnostic,
schema-driven, and built for enterprise architecture modelling across
all layers (not just events).

## G6B1-24

- Evidence ID: `NO-EVIDENCE`
- Repository: `fauzisho/awesome-antipattern`
- Commit: `none`
- Path: `none`
- Excerpt hash: `sha256:0114b60c9746bef556722c71e0342a5bebdc0727fe7fa38681145b80a3a83302`

[No governed bounded evidence is available for this control.]
